# Persist a recorded trip and its community completion atomically. A stable
# client ID allows retries after the server committed but the response was lost.
class RecordRide
  def self.call(user:, attributes:, completed_route_id: nil)
    unless attributes[:client_id].to_s.match?(/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i)
      invalid = user.routes.new
      invalid.errors.add(:client_id, "inválido")
      raise ActiveRecord::RecordInvalid.new(invalid)
    end

    user.with_lock do
      existing = user.routes.find_by(client_id: attributes[:client_id])
      return existing if existing

      route = user.routes.create!(attributes)
      if route.completed? && completed_route_id.present?
        source = Route.publicly_visible.find_by(id: completed_route_id)
        if source
          source.increment!(:times_completed)
          RouteCompletion.create!(user: user, route: source)
        end
      end
      route
    end
  end
end
