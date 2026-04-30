class CreateRoutes < ActiveRecord::Migration[8.1]
  def change
    create_table :routes do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.string :origin_name, null: false
      t.string :destination_name, null: false
      t.st_point :origin_coords, geographic: true, null: false
      t.st_point :destination_coords, geographic: true, null: false
      t.line_string :path_coords, geographic: true
      t.float :distance_km
      t.integer :duration_minutes
      t.integer :score
      t.boolean :public, default: false, null: false

      t.timestamps
    end

    add_index :routes, :public
  end
end
