module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate!
    end
  end
end
