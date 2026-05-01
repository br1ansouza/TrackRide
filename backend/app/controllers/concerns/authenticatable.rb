module Authenticatable
  extend ActiveSupport::Concern

  private

  def authenticate!
    token = request.headers["Authorization"]&.split(" ")&.last
    payload = JwtService.decode(token) if token
    @current_user = User.find_by(id: payload&.dig(:user_id))

    render json: { error: "Não autorizado" }, status: :unauthorized unless @current_user
  end

  def current_user
    @current_user
  end
end
