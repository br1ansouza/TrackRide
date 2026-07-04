class UserMailer < ApplicationMailer
  def reset_password(user, raw_token)
    @user = user
    @reset_url = "#{frontend_url}/reset-password?token=#{raw_token}"

    mail(to: user.email, subject: "TrackRide — Redefinir senha")
  end

  private

  def frontend_url
    Rails.application.config.action_mailer.default_url_options.then do |opts|
      "http://#{opts[:host]}:#{opts[:port]}"
    end
  end
end
