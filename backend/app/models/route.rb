class Route < ApplicationRecord
  belongs_to :user

  validates :name, presence: true
  validates :origin_name, presence: true
  validates :destination_name, presence: true
  validates :origin_coords, presence: true
  validates :destination_coords, presence: true

  scope :by_user, ->(user) { where(user: user) }
  scope :publicly_visible, -> { where(public: true) }
  scope :recent, -> { order(created_at: :desc) }
end
