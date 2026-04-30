Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(
      ENV.fetch("FRONTEND_URL", "http://localhost:5173"),
      "http://localhost:4173",
      /\Ahttp:\/\/192\.168\.\d+\.\d+:\d+\z/
    )

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
