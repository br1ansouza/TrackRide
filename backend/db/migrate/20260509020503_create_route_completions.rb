class CreateRouteCompletions < ActiveRecord::Migration[8.1]
  def change
    create_table :route_completions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :route, null: false, foreign_key: true

      t.timestamps
    end
  end
end
