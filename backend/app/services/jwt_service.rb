class JwtService
  SECRET = Rails.application.credentials.secret_key_base
  ALGORITHM = "HS256"
  EXPIRATION = 7.days

  def self.encode(user_id)
    payload = { user_id: user_id, exp: EXPIRATION.from_now.to_i }
    JWT.encode(payload, SECRET, ALGORITHM)
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET, true, algorithm: ALGORITHM)
    decoded.first.symbolize_keys
  rescue JWT::DecodeError
    nil
  end
end
