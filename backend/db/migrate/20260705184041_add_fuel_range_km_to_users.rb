class AddFuelRangeKmToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :fuel_range_km, :integer
  end
end
