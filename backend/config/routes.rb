Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post "auth/register", to: "auth#register"
      post "auth/login", to: "auth#login"
      get "auth/me", to: "auth#me"
      patch "auth/profile", to: "auth#update_profile"

      resources :routes, only: [:index, :show, :create, :update, :destroy]
    end
  end
end
