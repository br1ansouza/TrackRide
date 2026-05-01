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

  puts "Seed concluído: #{User.count} usuário(s), #{Route.count} rota(s)"
else
  puts "Seed ignorado: defina SEED_USER_EMAIL no .env"
end
