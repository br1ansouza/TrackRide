class CreateRouteLikes < ActiveRecord::Migration[8.1]
  def change
    create_table :route_likes do |t|
      t.references :user, null: false, foreign_key: true
      t.references :route, null: false, foreign_key: true

      t.timestamps
    end
    add_index :route_likes, [:user_id, :route_id], unique: true
  end
end
