class User < ApplicationRecord
  has_secure_password
  has_many :routes, dependent: :destroy

  enum :riding_preference, { calm: 0, mixed: 1, sport: 2 }

  validates :name, presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 6 }, if: :password_digest_changed?
end
