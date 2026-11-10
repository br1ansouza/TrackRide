class AddRouteSyncAndLookupIndexes < ActiveRecord::Migration[8.1]
  def change
    add_column :routes, :client_id, :uuid
    add_index :routes, [ :user_id, :client_id ], unique: true
    add_index :routes, :origin_coords, using: :gist
    add_index :routes, [ :user_id, :created_at ]
  end
end
