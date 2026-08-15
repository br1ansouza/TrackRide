# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_15_210000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "fuzzystrmatch"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "postgis"

  create_table "public.route_completions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "route_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["route_id"], name: "index_route_completions_on_route_id"
    t.index ["user_id"], name: "index_route_completions_on_user_id"
  end

  create_table "public.route_likes", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "route_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["route_id"], name: "index_route_likes_on_route_id"
    t.index ["user_id", "route_id"], name: "index_route_likes_on_user_id_and_route_id", unique: true
    t.index ["user_id"], name: "index_route_likes_on_user_id"
  end

  create_table "public.route_stops", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.geography "position", limit: {:srid=>4326, :type=>"st_point", :geographic=>true}, null: false
    t.bigint "route_id", null: false
    t.integer "sort_order", default: 0, null: false
    t.integer "stop_type", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["route_id"], name: "index_route_stops_on_route_id"
  end

  create_table "public.routes", force: :cascade do |t|
    t.boolean "completed", default: false, null: false
    t.datetime "created_at", null: false
    t.geography "destination_coords", limit: {:srid=>4326, :type=>"st_point", :geographic=>true}, null: false
    t.string "destination_name", null: false
    t.float "distance_km"
    t.integer "duration_minutes"
    t.string "name", null: false
    t.geography "origin_coords", limit: {:srid=>4326, :type=>"st_point", :geographic=>true}, null: false
    t.string "origin_name", null: false
    t.geography "path_coords", limit: {:srid=>4326, :type=>"line_string", :geographic=>true}
    t.boolean "public", default: false, null: false
    t.integer "score"
    t.integer "times_completed", default: 0, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["public"], name: "index_routes_on_public"
    t.index ["user_id"], name: "index_routes_on_user_id"
  end

  create_table "public.users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.integer "fuel_range_km"
    t.string "name", null: false
    t.string "password_digest", null: false
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.integer "riding_preference", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "public.route_completions", "public.routes"
  add_foreign_key "public.route_completions", "public.users"
  add_foreign_key "public.route_likes", "public.routes"
  add_foreign_key "public.route_likes", "public.users"
  add_foreign_key "public.route_stops", "public.routes"
  add_foreign_key "public.routes", "public.users"
end
