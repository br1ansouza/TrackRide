class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAILER_FROM") { ENV.fetch("SMTP_USERNAME", "noreply@trackride.com") }
  layout "mailer"
end
