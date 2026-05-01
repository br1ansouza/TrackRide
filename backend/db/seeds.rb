if ENV["SEED_USER_EMAIL"].present?
  user = User.find_or_create_by!(email: ENV["SEED_USER_EMAIL"]) do |u|
    u.name = ENV.fetch("SEED_USER_NAME", "Admin")
    u.password = ENV.fetch("SEED_USER_PASSWORD", "123456")
    u.password_confirmation = ENV.fetch("SEED_USER_PASSWORD", "123456")
    u.riding_preference = :mixed
  end

  Route.find_or_create_by!(user: user, name: "Floripa - Curitiba") do |r|
    r.origin_name = "Florianópolis"
    r.destination_name = "Curitiba"
    r.origin_coords = "POINT(-48.5496 -27.5973)"
    r.destination_coords = "POINT(-49.2733 -25.4284)"
    r.distance_km = 300
    r.duration_minutes = 240
    r.score = 85
  end

  Route.find_or_create_by!(user: user, name: "Floripa - Balneário Camboriú") do |r|
    r.origin_name = "Florianópolis"
    r.destination_name = "Balneário Camboriú"
    r.origin_coords = "POINT(-48.5496 -27.5973)"
    r.destination_coords = "POINT(-48.6353 -26.9906)"
    r.distance_km = 80
    r.duration_minutes = 60
    r.score = 92
  end

  community = User.find_or_create_by!(email: ENV.fetch("SEED_COMMUNITY_EMAIL", "comunidade@trackride.com")) do |u|
    u.name = "TrackRide SC"
    u.password = ENV.fetch("SEED_COMMUNITY_PASSWORD", "trackride2026")
    u.password_confirmation = ENV.fetch("SEED_COMMUNITY_PASSWORD", "trackride2026")
    u.riding_preference = :mixed
  end

  public_routes = [
    {
      name: "Floripa → Garopaba (Litoral Sul)",
      origin_name: "Florianópolis",
      destination_name: "Garopaba",
      origin_coords: "POINT(-48.5496 -27.5973)",
      destination_coords: "POINT(-48.6178 -28.0267)",
      distance_km: 90,
      duration_minutes: 100,
      score: 88
    },
    {
      name: "Floripa → Bombinhas (Costa Esmeralda)",
      origin_name: "Florianópolis",
      destination_name: "Bombinhas",
      origin_coords: "POINT(-48.5496 -27.5973)",
      destination_coords: "POINT(-48.5147 -27.1392)",
      distance_km: 75,
      duration_minutes: 80,
      score: 90
    },
    {
      name: "Floripa → Serra do Rio do Rastro (SC-390)",
      origin_name: "Florianópolis",
      destination_name: "Serra do Rio do Rastro",
      origin_coords: "POINT(-48.5496 -27.5973)",
      destination_coords: "POINT(-49.6064 -28.0753)",
      distance_km: 280,
      duration_minutes: 300,
      score: 95
    },
    {
      name: "Floripa → Urubici (Serra Catarinense)",
      origin_name: "Florianópolis",
      destination_name: "Urubici",
      origin_coords: "POINT(-48.5496 -27.5973)",
      destination_coords: "POINT(-49.5917 -28.0153)",
      distance_km: 170,
      duration_minutes: 180,
      score: 91
    },
    {
      name: "Floripa → Rancho Queimado (Vale Europeu)",
      origin_name: "Florianópolis",
      destination_name: "Rancho Queimado",
      origin_coords: "POINT(-48.5496 -27.5973)",
      destination_coords: "POINT(-49.0183 -27.6714)",
      distance_km: 70,
      duration_minutes: 75,
      score: 86
    },
    {
      name: "Garopaba → Praia do Rosa (Litoral Sul)",
      origin_name: "Garopaba",
      destination_name: "Praia do Rosa",
      origin_coords: "POINT(-48.6178 -28.0267)",
      destination_coords: "POINT(-48.6336 -28.1250)",
      distance_km: 18,
      duration_minutes: 25,
      score: 93
    }
  ]

  public_routes.each do |attrs|
    Route.find_or_create_by!(user: community, name: attrs[:name]) do |r|
      r.assign_attributes(attrs.merge(public: true))
    end
  end

  puts "Seed concluído: #{User.count} usuário(s), #{Route.count} rota(s) (#{Route.publicly_visible.count} públicas)"
else
  puts "Seed ignorado: defina SEED_USER_EMAIL no .env"
end
