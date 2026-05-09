class AddTimesCompletedToRoutes < ActiveRecord::Migration[8.1]
  def change
    add_column :routes, :times_completed, :integer, default: 0, null: false
  end
end
