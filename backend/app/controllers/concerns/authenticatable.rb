module Authenticatable
  extend ActiveSupport::Concern

  private

  def authenticate!
    token = request.headers["Authorization"]&.split(" ")&.last
    payload = JwtService.decode(token) if token
    @current_user = User.find_by(id: payload&.dig(:user_id))

    if @current_user && payload[:session_version] != JwtService.session_version(@current_user)
      @current_user = nil
    end

    render json: { error: "Não autorizado" }, status: :unauthorized unless @current_user
  end

  def current_user
    @current_user
  end
end
