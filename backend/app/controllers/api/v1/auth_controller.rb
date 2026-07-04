module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate!, only: [:register, :login, :forgot_password, :reset_password]
      wrap_parameters false

      rate_limit to: 10, within: 1.minute, only: [:login, :register],
        with: -> { render json: { error: "Muitas tentativas. Aguarde um minuto." }, status: :too_many_requests }
      rate_limit to: 5, within: 15.minutes, only: [:forgot_password, :reset_password],
        with: -> { render json: { error: "Muitas tentativas. Aguarde alguns minutos." }, status: :too_many_requests }

      def register
        user = User.new(register_params)

        if user.save
          token = JwtService.encode(user.id)
          render json: { token: token, user: user_response(user) }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def login
        user = User.find_by(email: params[:email])

        if user&.authenticate(params[:password])
          token = JwtService.encode(user.id)
          render json: { token: token, user: user_response(user) }
        else
          render json: { error: "Email ou senha inválidos" }, status: :unauthorized
        end
      end

      def me
        render json: { user: user_response(current_user) }
      end

      def update_profile
        if current_user.update(profile_params)
          render json: { user: user_response(current_user) }
        else
          render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def forgot_password
        user = User.find_by(email: params[:email])

        if user
          user.generate_reset_token!
          UserMailer.reset_password(user).deliver_later
        end

        render json: { message: "Se o email existir, enviaremos instruções de recuperação." }
      end

      def reset_password
        user = User.find_by(reset_password_token: params[:token])

        if user.nil? || !user.reset_token_valid?
          return render json: { error: "Token inválido ou expirado" }, status: :unprocessable_entity
        end

        if user.update(password: params[:password], password_confirmation: params[:password_confirmation])
          user.clear_reset_token!
          render json: { message: "Senha redefinida com sucesso" }
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def register_params
        params.permit(:name, :email, :password, :password_confirmation)
      end

      def profile_params
        params.permit(:name, :riding_preference)
      end

      def user_response(user)
        {
          id: user.id,
          name: user.name,
          email: user.email,
          riding_preference: user.riding_preference,
          created_at: user.created_at
        }
      end
    end
  end
end
