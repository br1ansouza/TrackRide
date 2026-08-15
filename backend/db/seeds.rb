load Rails.root.join("db/seeds/demo_user.rb") if ENV["SEED_USER_EMAIL"].present?
load Rails.root.join("db/seeds/communities.rb")

puts "Seed concluído: #{User.count} usuário(s), #{Route.count} rota(s) (#{Route.publicly_visible.count} públicas)"
