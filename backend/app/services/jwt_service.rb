class JwtService
  SECRET = Rails.application.secret_key_base
  ALGORITHM = "HS256"
  EXPIRATION = 7.days

  def self.encode(user_id)
    user = User.find(user_id)
    payload = { user_id: user.id, session_version: session_version(user), exp: EXPIRATION.from_now.to_i }
    JWT.encode(payload, SECRET, ALGORITHM)
  end

  def self.session_version(user)
    OpenSSL::HMAC.hexdigest("SHA256", SECRET, user.password_digest)
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET, true, algorithm: ALGORITHM, required_claims: [ "exp", "user_id", "session_version" ])
    decoded.first.symbolize_keys
  rescue JWT::DecodeError
    nil
  end
end
