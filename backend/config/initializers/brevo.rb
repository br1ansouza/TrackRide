Rails.application.config.to_prepare do
  ActionMailer::Base.add_delivery_method :brevo, BrevoDelivery, api_key: ENV["BREVO_API_KEY"]
end
