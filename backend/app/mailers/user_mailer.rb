class UserMailer < ApplicationMailer
  def reset_password(user)
    @user = user
    @reset_url = "#{frontend_url}/reset-password?token=#{user.reset_password_token}"

    mail(to: user.email, subject: "TrackRide — Redefinir senha")
  end

  private

  def frontend_url
    Rails.application.config.action_mailer.default_url_options.then do |opts|
      "http://#{opts[:host]}:#{opts[:port]}"
    end
  end
end
