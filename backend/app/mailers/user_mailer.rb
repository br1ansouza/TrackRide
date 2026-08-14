class UserMailer < ApplicationMailer
  def reset_password(user, raw_token)
    @user = user
    @reset_url = "#{frontend_url}/reset-password?token=#{raw_token}"

    mail(to: user.email, subject: "TrackRide — Redefinir senha")
  end

  private

  def frontend_url
    ENV.fetch("FRONTEND_URL", "http://localhost:4173")
  end
end
