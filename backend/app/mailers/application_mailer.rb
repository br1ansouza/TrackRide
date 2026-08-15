class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAILER_FROM") { ENV.fetch("SMTP_USERNAME", "noreply@trackride.com") }
  layout "mailer"

  before_action :set_app_url

  private

  def set_app_url
    @app_url = ENV.fetch("FRONTEND_URL", "http://localhost:4173").chomp("/")
  end
end
