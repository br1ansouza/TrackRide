module Api
  module V1
    class RoutesController < BaseController
      before_action :set_route, only: [:show, :update, :destroy]

      def index
        routes = current_user.routes.recent
        routes = routes.where("created_at >= ?", params[:since].to_date) if params[:since].present?
        routes = routes.limit(params[:limit] || 20).offset(params[:offset] || 0)

        render json: {
          routes: routes.map { |r| route_response(r) },
          total: current_user.routes.count
        }
      end

      def explore
        lat = params[:lat].to_f
        lon = params[:lon].to_f
        radius = [(params[:radius] || 80).to_i, 200].min * 1000

        routes = Route.publicly_visible
          .where.not(user_id: current_user.id)
          .where("ST_DWithin(origin_coords, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)", lon, lat, radius)
          .order(score: :desc)
          .limit(params[:limit] || 10)

        render json: {
          routes: routes.map { |r| explore_response(r) },
          total: routes.size
        }
      end

      def show
        render json: { route: route_response(@route) }
      end

      def create
        if params[:origin_coords].present? && params[:destination_coords].present?
          existing = current_user.routes.find_by(
            origin_name: params[:origin_name],
            destination_name: params[:destination_name]
          )
          if existing
            return render json: { error: "Rota já existe no histórico" }, status: :conflict
          end
        end

        route = current_user.routes.new(route_params)

        if route.save
          render json: { route: route_response(route) }, status: :created
        else
          render json: { errors: route.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if params[:public] == true && !@route.public
          existing = Route.publicly_visible
            .where.not(id: @route.id)
            .where("ST_DWithin(origin_coords, ?::geography, 5000) AND ST_DWithin(destination_coords, ?::geography, 5000)", @route.origin_coords, @route.destination_coords)
            .exists?
          if existing
            return render json: { error: "Já existe uma rota pública com esse trajeto" }, status: :conflict
          end
        end

        if @route.update(route_params)
          render json: { route: route_response(@route) }
        else
          render json: { errors: @route.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @route.destroy
        head :no_content
      end

      private

      def set_route
        @route = current_user.routes.find_by(id: params[:id])
        render json: { error: "Rota não encontrada" }, status: :not_found unless @route
      end

      def route_params
        permitted = params.permit(
          :name, :origin_name, :destination_name,
          :distance_km, :duration_minutes, :score, :public,
          origin_coords: [], destination_coords: [], path_coords: []
        )

        build_geo_params(permitted)
      end

      def build_geo_params(permitted)
        result = permitted.except(:origin_coords, :destination_coords, :path_coords)

        if permitted[:origin_coords].present?
          lon, lat = permitted[:origin_coords].map(&:to_f)
          result[:origin_coords] = "POINT(#{lon} #{lat})"
        end

        if permitted[:destination_coords].present?
          lon, lat = permitted[:destination_coords].map(&:to_f)
          result[:destination_coords] = "POINT(#{lon} #{lat})"
        end

        if permitted[:path_coords].present?
          coords = permitted[:path_coords].map(&:to_f)
          points = coords.each_slice(2).map { |lon, lat| "#{lon} #{lat}" }.join(", ")
          result[:path_coords] = "LINESTRING(#{points})"
        end

        result
      end

      def route_response(route)
        {
          id: route.id,
          name: route.name,
          origin_name: route.origin_name,
          destination_name: route.destination_name,
          origin_coords: coords_to_array(route.origin_coords),
          destination_coords: coords_to_array(route.destination_coords),
          path_coords: linestring_to_array(route.path_coords),
          distance_km: route.distance_km,
          duration_minutes: route.duration_minutes,
          score: route.score,
          public: route.public,
          created_at: route.created_at,
          updated_at: route.updated_at
        }
      end

      def explore_response(route)
        route_response(route).merge(author_name: route.user.name)
      end

      def coords_to_array(point)
        return nil unless point
        [point.x, point.y]
      end

      def linestring_to_array(line)
        return nil unless line
        line.points.map { |p| [p.x, p.y] }
      end
    end
  end
end
