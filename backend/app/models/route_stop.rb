class RouteStop < ApplicationRecord
  belongs_to :route

  enum :stop_type, { other: 0, gas_station: 1, restaurant: 2, rest: 3, viewpoint: 4 }

  validates :name, presence: true
  validates :position, presence: true
end
