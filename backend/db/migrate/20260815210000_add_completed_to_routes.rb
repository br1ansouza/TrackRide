class AddCompletedToRoutes < ActiveRecord::Migration[8.1]
  def up
    add_column :routes, :completed, :boolean, default: false, null: false

    execute <<~SQL
      UPDATE routes
         SET completed = true
       WHERE path_coords IS NOT NULL
         AND ST_DWithin(ST_EndPoint(path_coords::geometry)::geography, destination_coords, 120);
    SQL
  end

  def down
    remove_column :routes, :completed
  end
end
