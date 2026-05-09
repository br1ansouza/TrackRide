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

ActiveRecord::Schema[8.1].define(version: 2026_05_09_020503) do
  create_schema "tiger"
  create_schema "topology"

  # These are extensions that must be enabled in order to support this database
  enable_extension "fuzzystrmatch"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "postgis"
  enable_extension "tiger.postgis_tiger_geocoder"
  enable_extension "topology.postgis_topology"

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


  create_table "tiger.addr", primary_key: "gid", id: :serial, force: :cascade do |t|
    t.string "arid", limit: 22
    t.integer "fromarmid"
    t.string "fromhn", limit: 12
    t.string "fromtyp", limit: 1
    t.string "mtfcc", limit: 5
    t.string "plus4", limit: 4
    t.string "side", limit: 1
    t.string "statefp", limit: 2
    t.bigint "tlid"
    t.integer "toarmid"
    t.string "tohn", limit: 12
    t.string "totyp", limit: 1
    t.string "zip", limit: 5
    t.index ["tlid", "statefp"], name: "idx_tiger_addr_tlid_statefp"
    t.index ["zip"], name: "idx_tiger_addr_zip"
  end

  create_table "tiger.addrfeat", primary_key: "gid", id: :serial, force: :cascade do |t|
    t.string "aridl", limit: 22
    t.string "aridr", limit: 22
    t.string "edge_mtfcc", limit: 5
    t.string "fullname", limit: 100
    t.string "lfromhn", limit: 12
    t.string "lfromtyp", limit: 1
    t.string "linearid", limit: 22
    t.string "ltohn", limit: 12
    t.string "ltotyp", limit: 1
    t.string "offsetl", limit: 1
    t.string "offsetr", limit: 1
    t.string "parityl", limit: 1
    t.string "parityr", limit: 1
    t.string "plus4l", limit: 4
    t.string "plus4r", limit: 4
    t.string "rfromhn", limit: 12
    t.string "rfromtyp", limit: 1
    t.string "rtohn", limit: 12
    t.string "rtotyp", limit: 1
    t.string "statefp", limit: 2, null: false
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.bigint "tlid"
    t.string "zipl", limit: 5
    t.string "zipr", limit: 5
    t.index ["the_geom"], name: "idx_addrfeat_geom_gist", using: :gist
    t.index ["tlid"], name: "idx_addrfeat_tlid"
    t.index ["zipl"], name: "idx_addrfeat_zipl"
    t.index ["zipr"], name: "idx_addrfeat_zipr"
    t.check_constraint "public.geometrytype(the_geom) = 'LINESTRING'::text OR the_geom IS NULL", name: "enforce_geotype_the_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_the_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_the_geom"
  end

  create_table "tiger.bg", primary_key: "bg_id", id: { type: :string, limit: 12 }, comment: "block groups", force: :cascade do |t|
    t.float "aland"
    t.float "awater"
    t.string "blkgrpce", limit: 1
    t.string "countyfp", limit: 3
    t.string "funcstat", limit: 1
    t.serial "gid", null: false
    t.string "intptlat", limit: 11
    t.string "intptlon", limit: 12
    t.string "mtfcc", limit: 5
    t.string "namelsad", limit: 13
    t.string "statefp", limit: 2
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.string "tractce", limit: 6
    t.check_constraint "public.geometrytype(the_geom) = 'MULTIPOLYGON'::text OR the_geom IS NULL", name: "enforce_geotype_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_geom"
  end

  create_table "tiger.county", primary_key: "cntyidfp", id: { type: :string, limit: 5 }, force: :cascade do |t|
    t.bigint "aland"
    t.float "awater"
    t.string "cbsafp", limit: 5
    t.string "classfp", limit: 2
    t.string "countyfp", limit: 3
    t.string "countyns", limit: 8
    t.string "csafp", limit: 3
    t.string "funcstat", limit: 1
    t.serial "gid", null: false
    t.string "intptlat", limit: 11
    t.string "intptlon", limit: 12
    t.string "lsad", limit: 2
    t.string "metdivfp", limit: 5
    t.string "mtfcc", limit: 5
    t.string "name", limit: 100
    t.string "namelsad", limit: 100
    t.string "statefp", limit: 2
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.index ["countyfp"], name: "idx_tiger_county"
    t.check_constraint "public.geometrytype(the_geom) = 'MULTIPOLYGON'::text OR the_geom IS NULL", name: "enforce_geotype_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_geom"
    t.unique_constraint ["gid"], name: "uidx_county_gid"
  end

  create_table "tiger.county_lookup", primary_key: ["st_code", "co_code"], force: :cascade do |t|
    t.integer "co_code", null: false
    t.string "name", limit: 90
    t.integer "st_code", null: false
    t.string "state", limit: 2
    t.index "public.soundex((name)::text)", name: "county_lookup_name_idx"
    t.index ["state"], name: "county_lookup_state_idx"
  end

  create_table "tiger.countysub_lookup", primary_key: ["st_code", "co_code", "cs_code"], force: :cascade do |t|
    t.integer "co_code", null: false
    t.string "county", limit: 90
    t.integer "cs_code", null: false
    t.string "name", limit: 90
    t.integer "st_code", null: false
    t.string "state", limit: 2
    t.index "public.soundex((name)::text)", name: "countysub_lookup_name_idx"
    t.index ["state"], name: "countysub_lookup_state_idx"
  end

  create_table "tiger.cousub", primary_key: "cosbidfp", id: { type: :string, limit: 10 }, force: :cascade do |t|
    t.decimal "aland", precision: 14
    t.decimal "awater", precision: 14
    t.string "classfp", limit: 2
    t.string "cnectafp", limit: 3
    t.string "countyfp", limit: 3
    t.string "cousubfp", limit: 5
    t.string "cousubns", limit: 8
    t.string "funcstat", limit: 1
    t.serial "gid", null: false
    t.string "intptlat", limit: 11
    t.string "intptlon", limit: 12
    t.string "lsad", limit: 2
    t.string "mtfcc", limit: 5
    t.string "name", limit: 100
    t.string "namelsad", limit: 100
    t.string "nctadvfp", limit: 5
    t.string "nectafp", limit: 5
    t.string "statefp", limit: 2
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.index ["the_geom"], name: "tige_cousub_the_geom_gist", using: :gist
    t.check_constraint "public.geometrytype(the_geom) = 'MULTIPOLYGON'::text OR the_geom IS NULL", name: "enforce_geotype_the_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_the_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_the_geom"
    t.unique_constraint ["gid"], name: "uidx_cousub_gid"
  end

  create_table "tiger.direction_lookup", primary_key: "name", id: { type: :string, limit: 20 }, force: :cascade do |t|
    t.string "abbrev", limit: 3
    t.index ["abbrev"], name: "direction_lookup_abbrev_idx"
  end

  create_table "tiger.edges", primary_key: "gid", id: :serial, force: :cascade do |t|
    t.string "artpath", limit: 1
    t.string "countyfp", limit: 3
    t.string "deckedroad", limit: 1
    t.string "divroad", limit: 1
    t.string "exttyp", limit: 1
    t.string "featcat", limit: 1
    t.string "fullname", limit: 100
    t.string "gcseflg", limit: 1
    t.string "hydroflg", limit: 1
    t.string "lfromadd", limit: 12
    t.string "ltoadd", limit: 12
    t.string "mtfcc", limit: 5
    t.string "offsetl", limit: 1
    t.string "offsetr", limit: 1
    t.string "olfflg", limit: 1
    t.string "passflg", limit: 1
    t.string "persist", limit: 1
    t.string "railflg", limit: 1
    t.string "rfromadd", limit: 12
    t.string "roadflg", limit: 1
    t.string "rtoadd", limit: 12
    t.string "smid", limit: 22
    t.string "statefp", limit: 2
    t.decimal "tfidl", precision: 10
    t.decimal "tfidr", precision: 10
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.bigint "tlid"
    t.decimal "tnidf", precision: 10
    t.decimal "tnidt", precision: 10
    t.string "ttyp", limit: 1
    t.string "zipl", limit: 5
    t.string "zipr", limit: 5
    t.index ["countyfp"], name: "idx_tiger_edges_countyfp"
    t.index ["the_geom"], name: "idx_tiger_edges_the_geom_gist", using: :gist
    t.index ["tlid"], name: "idx_edges_tlid"
    t.check_constraint "public.geometrytype(the_geom) = 'MULTILINESTRING'::text OR the_geom IS NULL", name: "enforce_geotype_the_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_the_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_the_geom"
  end

  create_table "tiger.faces", primary_key: "gid", id: :serial, force: :cascade do |t|
    t.string "aiannhce", limit: 4
    t.string "aiannhce00", limit: 4
    t.string "aiannhfp", limit: 5
    t.string "aiannhfp00", limit: 5
    t.string "anrcfp", limit: 5
    t.string "anrcfp00", limit: 5
    t.float "atotal"
    t.string "blkgrpce", limit: 1
    t.string "blkgrpce00", limit: 1
    t.string "blkgrpce20", limit: 1
    t.string "blockce", limit: 4
    t.string "blockce00", limit: 4
    t.string "blockce20", limit: 4
    t.string "cbsafp", limit: 5
    t.string "cd108fp", limit: 2
    t.string "cd111fp", limit: 2
    t.string "cnectafp", limit: 3
    t.string "comptyp", limit: 1
    t.string "comptyp00", limit: 1
    t.string "conctyfp", limit: 5
    t.string "conctyfp00", limit: 5
    t.string "countyfp", limit: 3
    t.string "countyfp00", limit: 3
    t.string "countyfp20", limit: 3
    t.string "cousubfp", limit: 5
    t.string "cousubfp00", limit: 5
    t.string "csafp", limit: 3
    t.string "elsdlea", limit: 5
    t.string "elsdlea00", limit: 5
    t.string "intptlat", limit: 11
    t.string "intptlon", limit: 12
    t.string "lwflag", limit: 1
    t.string "metdivfp", limit: 5
    t.string "nctadvfp", limit: 5
    t.string "nectafp", limit: 5
    t.string "offset", limit: 1
    t.string "placefp", limit: 5
    t.string "placefp00", limit: 5
    t.string "puma5ce", limit: 5
    t.string "puma5ce00", limit: 5
    t.string "scsdlea", limit: 5
    t.string "scsdlea00", limit: 5
    t.string "sldlst", limit: 3
    t.string "sldlst00", limit: 3
    t.string "sldust", limit: 3
    t.string "sldust00", limit: 3
    t.string "statefp", limit: 2
    t.string "statefp00", limit: 2
    t.string "statefp20", limit: 2
    t.string "submcdfp", limit: 5
    t.string "submcdfp00", limit: 5
    t.string "tazce", limit: 6
    t.string "tazce00", limit: 6
    t.string "tblkgpce", limit: 1
    t.decimal "tfid", precision: 10
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.string "tractce", limit: 6
    t.string "tractce00", limit: 6
    t.string "tractce20", limit: 6
    t.string "trsubce", limit: 3
    t.string "trsubce00", limit: 3
    t.string "trsubfp", limit: 5
    t.string "trsubfp00", limit: 5
    t.string "ttractce", limit: 6
    t.string "uace", limit: 5
    t.string "uace00", limit: 5
    t.string "ugace", limit: 5
    t.string "ugace00", limit: 5
    t.string "unsdlea", limit: 5
    t.string "unsdlea00", limit: 5
    t.string "vtdst", limit: 6
    t.string "vtdst00", limit: 6
    t.string "zcta5ce", limit: 5
    t.string "zcta5ce00", limit: 5
    t.index ["countyfp"], name: "idx_tiger_faces_countyfp"
    t.index ["tfid"], name: "idx_tiger_faces_tfid"
    t.index ["the_geom"], name: "tiger_faces_the_geom_gist", using: :gist
    t.check_constraint "public.geometrytype(the_geom) = 'MULTIPOLYGON'::text OR the_geom IS NULL", name: "enforce_geotype_the_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_the_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_the_geom"
  end

  create_table "tiger.featnames", primary_key: "gid", id: :serial, force: :cascade do |t|
    t.string "fullname", limit: 100
    t.string "linearid", limit: 22
    t.string "mtfcc", limit: 5
    t.string "name", limit: 100
    t.string "paflag", limit: 1
    t.string "predir", limit: 2
    t.string "predirabrv", limit: 15
    t.string "prequal", limit: 2
    t.string "prequalabr", limit: 15
    t.string "pretyp", limit: 3
    t.string "pretypabrv", limit: 50
    t.string "statefp", limit: 2
    t.string "sufdir", limit: 2
    t.string "sufdirabrv", limit: 15
    t.string "sufqual", limit: 2
    t.string "sufqualabr", limit: 15
    t.string "suftyp", limit: 3
    t.string "suftypabrv", limit: 50
    t.bigint "tlid"
    t.index "lower((name)::text)", name: "idx_tiger_featnames_lname"
    t.index "public.soundex((name)::text)", name: "idx_tiger_featnames_snd_name"
    t.index ["tlid", "statefp"], name: "idx_tiger_featnames_tlid_statefp"
  end

  create_table "tiger.geocode_settings", primary_key: "name", id: :text, force: :cascade do |t|
    t.text "category"
    t.text "setting"
    t.text "short_desc"
    t.text "unit"
  end

  create_table "tiger.geocode_settings_default", primary_key: "name", id: :text, force: :cascade do |t|
    t.text "category"
    t.text "setting"
    t.text "short_desc"
    t.text "unit"
  end

  create_table "tiger.loader_lookuptables", primary_key: "lookup_name", id: { type: :text, comment: "This is the table name to inherit from and suffix of resulting output table -- how the table will be named --  edges here would mean -- ma_edges , pa_edges etc. except in the case of national tables. national level tables have no prefix" }, force: :cascade do |t|
    t.text "columns_exclude", comment: "List of columns to exclude as an array. This is excluded from both input table and output table and rest of columns remaining are assumed to be in same order in both tables. gid, geoid,cpi,suffix1ce are excluded if no columns are specified.", array: true
    t.string "insert_mode", limit: 1, default: "c", null: false
    t.boolean "level_county", default: false, null: false
    t.boolean "level_nation", default: false, null: false, comment: "These are tables that contain all data for the whole US so there is just a single file"
    t.boolean "level_state", default: false, null: false
    t.boolean "load", default: true, null: false, comment: "Whether or not to load the table.  For states and zcta5 (you may just want to download states10, zcta510 nationwide file manually) load your own into a single table that inherits from tiger.states, tiger.zcta5.  You'll get improved performance for some geocoding cases."
    t.text "post_load_process"
    t.text "pre_load_process"
    t.integer "process_order", default: 1000, null: false
    t.boolean "single_geom_mode", default: false
    t.boolean "single_mode", default: true, null: false
    t.text "table_name", comment: "suffix of the tables to load e.g.  edges would load all tables like *edges.dbf(shp)  -- so tl_2010_42129_edges.dbf .  "
    t.text "website_root_override", comment: "Path to use for wget instead of that specified in year table.  Needed currently for zcta where they release that only for 2000 and 2010"
  end

  create_table "tiger.loader_platform", primary_key: "os", id: { type: :string, limit: 50 }, force: :cascade do |t|
    t.text "county_process_command"
    t.text "declare_sect"
    t.text "environ_set_command"
    t.text "loader"
    t.text "path_sep"
    t.text "pgbin"
    t.text "psql"
    t.text "unzip_command"
    t.text "wget"
  end

  create_table "tiger.loader_variables", primary_key: "tiger_year", id: { type: :string, limit: 4 }, force: :cascade do |t|
    t.text "data_schema"
    t.text "staging_fold"
    t.text "staging_schema"
    t.text "website_root"
  end

  create_table "tiger.pagc_gaz", id: :serial, force: :cascade do |t|
    t.boolean "is_custom", default: true, null: false
    t.integer "seq"
    t.text "stdword"
    t.integer "token"
    t.text "word"
  end

  create_table "tiger.pagc_lex", id: :serial, force: :cascade do |t|
    t.boolean "is_custom", default: true, null: false
    t.integer "seq"
    t.text "stdword"
    t.integer "token"
    t.text "word"
  end

  create_table "tiger.pagc_rules", id: :serial, force: :cascade do |t|
    t.boolean "is_custom", default: true
    t.text "rule"
  end

  create_table "tiger.place", primary_key: "plcidfp", id: { type: :string, limit: 7 }, force: :cascade do |t|
    t.bigint "aland"
    t.bigint "awater"
    t.string "classfp", limit: 2
    t.string "cpi", limit: 1
    t.string "funcstat", limit: 1
    t.serial "gid", null: false
    t.string "intptlat", limit: 11
    t.string "intptlon", limit: 12
    t.string "lsad", limit: 2
    t.string "mtfcc", limit: 5
    t.string "name", limit: 100
    t.string "namelsad", limit: 100
    t.string "pcicbsa", limit: 1
    t.string "pcinecta", limit: 1
    t.string "placefp", limit: 5
    t.string "placens", limit: 8
    t.string "statefp", limit: 2
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.index ["the_geom"], name: "tiger_place_the_geom_gist", using: :gist
    t.check_constraint "public.geometrytype(the_geom) = 'MULTIPOLYGON'::text OR the_geom IS NULL", name: "enforce_geotype_the_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_the_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_the_geom"
    t.unique_constraint ["gid"], name: "uidx_tiger_place_gid"
  end

  create_table "tiger.place_lookup", primary_key: ["st_code", "pl_code"], force: :cascade do |t|
    t.string "name", limit: 90
    t.integer "pl_code", null: false
    t.integer "st_code", null: false
    t.string "state", limit: 2
    t.index "public.soundex((name)::text)", name: "place_lookup_name_idx"
    t.index ["state"], name: "place_lookup_state_idx"
  end

  create_table "tiger.secondary_unit_lookup", primary_key: "name", id: { type: :string, limit: 20 }, force: :cascade do |t|
    t.string "abbrev", limit: 5
    t.index ["abbrev"], name: "secondary_unit_lookup_abbrev_idx"
  end

  create_table "tiger.state", primary_key: "statefp", id: { type: :string, limit: 2 }, force: :cascade do |t|
    t.bigint "aland"
    t.bigint "awater"
    t.string "division", limit: 2
    t.string "funcstat", limit: 1
    t.serial "gid", null: false
    t.string "intptlat", limit: 11
    t.string "intptlon", limit: 12
    t.string "lsad", limit: 2
    t.string "mtfcc", limit: 5
    t.string "name", limit: 100
    t.string "region", limit: 2
    t.string "statens", limit: 8
    t.string "stusps", limit: 2, null: false
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.index ["the_geom"], name: "idx_tiger_state_the_geom_gist", using: :gist
    t.check_constraint "public.geometrytype(the_geom) = 'MULTIPOLYGON'::text OR the_geom IS NULL", name: "enforce_geotype_the_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_the_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_the_geom"
    t.unique_constraint ["gid"], name: "uidx_tiger_state_gid"
    t.unique_constraint ["stusps"], name: "uidx_tiger_state_stusps"
  end

  create_table "tiger.state_lookup", primary_key: "st_code", id: :integer, default: nil, force: :cascade do |t|
    t.string "abbrev", limit: 3
    t.string "name", limit: 40
    t.string "statefp", limit: 2

    t.unique_constraint ["abbrev"], name: "state_lookup_abbrev_key"
    t.unique_constraint ["name"], name: "state_lookup_name_key"
    t.unique_constraint ["statefp"], name: "state_lookup_statefp_key"
  end

  create_table "tiger.street_type_lookup", primary_key: "name", id: { type: :string, limit: 50 }, force: :cascade do |t|
    t.string "abbrev", limit: 50
    t.boolean "is_hw", default: false, null: false
    t.index ["abbrev"], name: "street_type_lookup_abbrev_idx"
  end

  create_table "tiger.tabblock", primary_key: "tabblock_id", id: { type: :string, limit: 16 }, force: :cascade do |t|
    t.float "aland"
    t.float "awater"
    t.string "blockce", limit: 4
    t.string "countyfp", limit: 3
    t.string "funcstat", limit: 1
    t.serial "gid", null: false
    t.string "intptlat", limit: 11
    t.string "intptlon", limit: 12
    t.string "mtfcc", limit: 5
    t.string "name", limit: 20
    t.string "statefp", limit: 2
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.string "tractce", limit: 6
    t.string "uace", limit: 5
    t.string "ur", limit: 1
    t.check_constraint "public.geometrytype(the_geom) = 'MULTIPOLYGON'::text OR the_geom IS NULL", name: "enforce_geotype_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_geom"
  end

  create_table "tiger.tabblock20", primary_key: "geoid", id: { type: :string, limit: 15 }, force: :cascade do |t|
    t.float "aland"
    t.float "awater"
    t.string "blockce", limit: 4
    t.string "countyfp", limit: 3
    t.string "funcstat", limit: 1
    t.float "housing"
    t.string "intptlat", limit: 11
    t.string "intptlon", limit: 12
    t.string "mtfcc", limit: 5
    t.string "name", limit: 10
    t.float "pop"
    t.string "statefp", limit: 2
    t.geometry "the_geom", limit: {:srid=>4269, :type=>"multi_polygon"}
    t.string "tractce", limit: 6
    t.string "uace", limit: 5
    t.string "uatype", limit: 1
    t.string "ur", limit: 1
  end

  create_table "tiger.tract", primary_key: "tract_id", id: { type: :string, limit: 11 }, force: :cascade do |t|
    t.float "aland"
    t.float "awater"
    t.string "countyfp", limit: 3
    t.string "funcstat", limit: 1
    t.serial "gid", null: false
    t.string "intptlat", limit: 11
    t.string "intptlon", limit: 12
    t.string "mtfcc", limit: 5
    t.string "name", limit: 7
    t.string "namelsad", limit: 20
    t.string "statefp", limit: 2
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.string "tractce", limit: 6
    t.check_constraint "public.geometrytype(the_geom) = 'MULTIPOLYGON'::text OR the_geom IS NULL", name: "enforce_geotype_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_geom"
  end

  create_table "tiger.zcta5", primary_key: ["zcta5ce", "statefp"], force: :cascade do |t|
    t.float "aland"
    t.float "awater"
    t.string "classfp", limit: 2
    t.string "funcstat", limit: 1
    t.serial "gid", null: false
    t.string "intptlat", limit: 11
    t.string "intptlon", limit: 12
    t.string "mtfcc", limit: 5
    t.string "partflg", limit: 1
    t.string "statefp", limit: 2, null: false
    t.geometry "the_geom", limit: {:srid=>0, :type=>"geometry"}
    t.string "zcta5ce", limit: 5, null: false

    t.check_constraint "public.geometrytype(the_geom) = 'MULTIPOLYGON'::text OR the_geom IS NULL", name: "enforce_geotype_the_geom"
    t.check_constraint "public.st_ndims(the_geom) = 2", name: "enforce_dims_the_geom"
    t.check_constraint "public.st_srid(the_geom) = 4269", name: "enforce_srid_the_geom"
    t.unique_constraint ["gid"], name: "uidx_tiger_zcta5_gid"
  end

  create_table "tiger.zip_lookup", primary_key: "zip", id: :integer, default: nil, force: :cascade do |t|
    t.integer "cnt"
    t.integer "co_code"
    t.string "county", limit: 90
    t.string "cousub", limit: 90
    t.integer "cs_code"
    t.integer "pl_code"
    t.string "place", limit: 90
    t.integer "st_code"
    t.string "state", limit: 2
  end

  create_table "tiger.zip_lookup_all", id: false, force: :cascade do |t|
    t.integer "cnt"
    t.integer "co_code"
    t.string "county", limit: 90
    t.string "cousub", limit: 90
    t.integer "cs_code"
    t.integer "pl_code"
    t.string "place", limit: 90
    t.integer "st_code"
    t.string "state", limit: 2
    t.integer "zip"
  end

  create_table "tiger.zip_lookup_base", primary_key: "zip", id: { type: :string, limit: 5 }, force: :cascade do |t|
    t.string "city", limit: 90
    t.string "county", limit: 90
    t.string "state", limit: 40
    t.string "statefp", limit: 2
  end

  create_table "tiger.zip_state", primary_key: ["zip", "stusps"], force: :cascade do |t|
    t.string "statefp", limit: 2
    t.string "stusps", limit: 2, null: false
    t.string "zip", limit: 5, null: false
  end

  create_table "tiger.zip_state_loc", primary_key: ["zip", "stusps", "place"], force: :cascade do |t|
    t.string "place", limit: 100, null: false
    t.string "statefp", limit: 2
    t.string "stusps", limit: 2, null: false
    t.string "zip", limit: 5, null: false
  end
end
