Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(
      ENV.fetch("FRONTEND_URL", "http://localhost:5173"),
      "http://localhost:4173",
      /\Ahttp:\/\/192\.168\.\d+\.\d+:\d+\z/,
      /\Ahttp:\/\/100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}:\d+\z/,
      /\Ahttp:\/\/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net(:\d+)?\z/
    )

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
