class User < ApplicationRecord
  has_secure_password
  has_many :routes, dependent: :destroy

  enum :riding_preference, { calm: 0, mixed: 1, sport: 2 }

  validates :name, presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 6 }, if: :password_digest_changed?

  def self.find_by_reset_token(raw_token)
    return nil if raw_token.blank?
    find_by(reset_password_token: Digest::SHA256.hexdigest(raw_token))
  end

  def generate_reset_token!
    raw_token = SecureRandom.urlsafe_base64(32)
    update!(
      reset_password_token: Digest::SHA256.hexdigest(raw_token),
      reset_password_sent_at: Time.current
    )
    raw_token
  end

  def reset_token_valid?
    reset_password_sent_at.present? && reset_password_sent_at > 2.hours.ago
  end

  def clear_reset_token!
    update!(reset_password_token: nil, reset_password_sent_at: nil)
  end
end
