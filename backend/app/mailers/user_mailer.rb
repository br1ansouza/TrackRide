class UserMailer < ApplicationMailer
  def reset_password(user, raw_token)
    @user = user
    @reset_url = "#{frontend_url}/reset-password?token=#{raw_token}"

    mail(to: user.email, subject: "TrackRide — Redefinir senha")
  end

  def password_changed(user)
    @user = user
    @frontend_url = frontend_url
    @changed_at = I18n.l(Time.current.in_time_zone("America/Sao_Paulo"), format: "%d/%m/%Y às %H:%M")

    mail(to: user.email, subject: "TrackRide — Sua senha foi alterada")
  end

  private

  def frontend_url
    ENV.fetch("FRONTEND_URL", "http://localhost:4173")
  end
end
