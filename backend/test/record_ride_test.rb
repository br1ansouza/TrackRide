ENV["RAILS_ENV"] = "test"
require_relative "../config/environment"
require "rails/test_help"

class RecordRideTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(name: "Rider", email: "ride-#{SecureRandom.hex(6)}@example.test", password: "test-password")
    @headers = { "Authorization" => "Bearer #{JwtService.encode(@user.id)}" }
    @attributes = {
      name: "Test ride", origin_name: "A", destination_name: "B",
      origin_coords: [ -48.5, -27.5 ], destination_coords: [ -48.6, -27.6 ],
      path_coords: [ -48.5, -27.5, -48.6, -27.6 ], completed: true,
      client_id: SecureRandom.uuid
    }
  end

  test "lost response can be replayed without duplicate trip or completion" do
    source = @user.routes.create!(name: "Community ride", origin_name: "Start", destination_name: "End",
      origin_coords: "POINT(-48.5 -27.5)", destination_coords: "POINT(-48.6 -27.6)", public: true)
    attributes = @attributes.merge(completed_route_id: source.id)
    2.times do
      post "/api/v1/routes", params: attributes, headers: @headers, as: :json
      assert_response :created
      assert_equal attributes[:client_id], response.parsed_body.dig("route", "client_id")
    end
    assert_equal 1, @user.routes.where(client_id: attributes[:client_id]).count
    assert_equal 1, source.reload.times_completed
    assert_equal 1, source.route_completions.count
  end

  test "a recorded trip may repeat a planned route or an earlier trip" do
    2.times do
      post "/api/v1/routes", params: @attributes.merge(client_id: SecureRandom.uuid), headers: @headers, as: :json
      assert_response :created
    end
    assert_equal 2, @user.routes.count
  end

  test "invalid client IDs cannot return an unrelated route" do
    post "/api/v1/routes", params: @attributes.merge(client_id: "invalid"), headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal 0, @user.routes.count
  end

  test "same client ID in different accounts does not leak another user's route" do
    post "/api/v1/routes", params: @attributes, headers: @headers, as: :json
    first_id = response.parsed_body.dig("route", "id")
    other = User.create!(name: "Other", email: "other-#{SecureRandom.hex(6)}@example.test", password: "test-password")
    post "/api/v1/routes", params: @attributes, headers: { "Authorization" => "Bearer #{JwtService.encode(other.id)}" }, as: :json
    assert_response :created
    refute_equal first_id, response.parsed_body.dig("route", "id")
  end

  test "summary listing omits geometry while detail retains it" do
    post "/api/v1/routes", params: @attributes, headers: @headers, as: :json
    id = response.parsed_body.dig("route", "id")
    get "/api/v1/routes", params: { summary: "1", limit: 20 }, headers: @headers
    assert_response :success
    assert_nil response.parsed_body["routes"].first["path_coords"]
    get "/api/v1/routes/#{id}", headers: @headers
    assert_equal 2, response.parsed_body.dig("route", "path_coords").length
  end

  test "PATCH cannot change a trip's retry identity" do
    post "/api/v1/routes", params: @attributes, headers: @headers, as: :json
    id = response.parsed_body.dig("route", "id")
    patch "/api/v1/routes/#{id}", params: { client_id: SecureRandom.uuid }, headers: @headers, as: :json
    assert_response :success
    assert_equal @attributes[:client_id], Route.find(id).client_id
  end
  test "completion failure rolls back the trip and public completion counter together" do
    source = @user.routes.create!(name: "Community ride", origin_name: "Start", destination_name: "End",
      origin_coords: "POINT(-48.5 -27.5)", destination_coords: "POINT(-48.6 -27.6)", public: true)
    abort_completion = proc { throw :abort }
    RouteCompletion.set_callback(:create, :before, abort_completion)
    assert_raises(ActiveRecord::RecordNotSaved) do
      RecordRide.call(user: @user,
        attributes: @attributes.except(:path_coords).merge(origin_coords: "POINT(-48.5 -27.5)", destination_coords: "POINT(-48.6 -27.6)"),
        completed_route_id: source.id)
    end
    assert_equal 0, @user.routes.where(client_id: @attributes[:client_id]).count
    assert_equal 0, source.reload.times_completed
    assert_equal 0, source.route_completions.count
  ensure
    RouteCompletion.skip_callback(:create, :before, abort_completion)
  end
end

class RecordRideConcurrencyTest < ActiveSupport::TestCase
  self.use_transactional_tests = false

  test "simultaneous requests with the same UUID create one trip" do
    user = User.create!(name: "Concurrent rider", email: "concurrent-#{SecureRandom.hex(6)}@example.test", password: "test-password")
    attributes = { name: "Concurrent ride", origin_name: "A", destination_name: "B",
      origin_coords: "POINT(-48.5 -27.5)", destination_coords: "POINT(-48.6 -27.6)", client_id: SecureRandom.uuid }
    ready = Queue.new
    start = Queue.new
    workers = 2.times.map do
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          rider = User.find(user.id)
          ready << true
          start.pop
          RecordRide.call(user: rider, attributes: attributes).id
        end
      end
    end
    2.times { ready.pop }
    2.times { start << true }
    assert_equal 1, workers.map(&:value).uniq.length
    assert_equal 1, user.routes.count
  ensure
    workers&.each(&:join)
    user&.destroy!
  end
end
