COMMUNITY_SEEDS = []
Dir[Rails.root.join("db/seeds/communities/*.rb")].sort.each { |file| load file }

COMMUNITY_SEEDS.each do |seed|
  community = User.find_or_create_by!(email: seed[:email]) do |u|
    password = ENV["SEED_COMMUNITY_PASSWORD"].presence || SecureRandom.hex(24)
    u.name = seed[:user_name]
    u.password = password
    u.password_confirmation = password
    u.riding_preference = :mixed
  end

  seed[:routes].each do |name, origin_name, destination_name, origin_coords, destination_coords, distance_km, duration_minutes, score|
    Route.find_or_create_by!(user: community, name: name) do |r|
      r.assign_attributes(
        origin_name: origin_name,
        destination_name: destination_name,
        origin_coords: origin_coords,
        destination_coords: destination_coords,
        distance_km: distance_km,
        duration_minutes: duration_minutes,
        score: score,
        public: true
      )
    end
  end
end
