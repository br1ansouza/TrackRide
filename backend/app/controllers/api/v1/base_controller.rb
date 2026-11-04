module Api
  module V1
    class BaseController < ApplicationController
      before_action :disable_response_cache
      before_action :authenticate!

      private

      def disable_response_cache
        response.headers["Cache-Control"] = "no-store"
      end
    end
  end
end
