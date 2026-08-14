require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false
  config.public_file_server.headers = { "cache-control" => "public, max-age=#{1.year.to_i}" }
  config.active_storage.service = :local
  config.log_tags = [ :request_id ]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")
  config.silence_healthcheck_path = "/up"
  config.active_support.report_deprecations = false
  config.cache_store = :memory_store, { size: 32.megabytes }
  config.active_job.queue_adapter = :async
  frontend = URI.parse(ENV.fetch("FRONTEND_URL", "http://localhost:4173"))
  config.action_mailer.default_url_options = { host: frontend.host, port: frontend.port, protocol: frontend.scheme }
  config.action_mailer.perform_deliveries = ENV["BREVO_API_KEY"].present? || ENV["SMTP_ADDRESS"].present?
  config.action_mailer.raise_delivery_errors = true

  if ENV["BREVO_API_KEY"].present?
    config.action_mailer.delivery_method = :brevo
  elsif ENV["SMTP_ADDRESS"].present?
    config.action_mailer.delivery_method = :smtp
    config.action_mailer.smtp_settings = {
      address: ENV["SMTP_ADDRESS"],
      port: ENV.fetch("SMTP_PORT", 587).to_i,
      domain: ENV.fetch("SMTP_DOMAIN") { ENV["SMTP_USERNAME"].to_s.split("@").last },
      user_name: ENV["SMTP_USERNAME"],
      password: ENV["SMTP_PASSWORD"],
      authentication: :plain,
      enable_starttls_auto: true,
      open_timeout: 10,
      read_timeout: 10
    }
  end
  config.i18n.fallbacks = true
  config.active_record.dump_schema_after_migration = false
  config.active_record.attributes_for_inspect = [ :id ]
end
