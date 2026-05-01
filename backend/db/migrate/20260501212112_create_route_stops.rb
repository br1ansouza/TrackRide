class CreateRouteStops < ActiveRecord::Migration[8.1]
  def change
    create_table :route_stops do |t|
      t.references :route, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :stop_type, default: 0, null: false
      t.st_point :position, geographic: true, null: false
      t.integer :sort_order, default: 0, null: false

      t.timestamps
    end
  end
end
