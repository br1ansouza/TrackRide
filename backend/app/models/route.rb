class Route < ApplicationRecord
  belongs_to :user
  has_many :route_stops, -> { order(:sort_order) }, dependent: :destroy
  accepts_nested_attributes_for :route_stops, allow_destroy: true

  validates :name, presence: true
  validates :origin_name, presence: true
  validates :destination_name, presence: true
  validates :origin_coords, presence: true
  validates :destination_coords, presence: true

  scope :by_user, ->(user) { where(user: user) }
  scope :publicly_visible, -> { where(public: true) }
  scope :recent, -> { order(created_at: :desc) }
end
