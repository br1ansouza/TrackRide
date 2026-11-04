require "minitest/autorun"
require "active_support/all"
require "jwt"
require "openssl"

module Rails
  def self.application
    Struct.new(:secret_key_base).new("synthetic-test-secret-only")
  end
end

class User
  attr_accessor :id, :password_digest

  def self.find(id)
    instance = new
    instance.id = id
    instance.password_digest = "synthetic-digest"
    instance
  end
end

require_relative "../app/services/jwt_service"

class JwtServiceTest < Minitest::Test
  def test_valid_session
    payload = JwtService.decode(JwtService.encode(7))
    assert_equal 7, payload[:user_id]
    assert_equal JwtService.session_version(User.find(7)), payload[:session_version]
    refute_includes payload.values, "synthetic-digest"
  end

  def test_password_change_invalidates_session_version
    payload = JwtService.decode(JwtService.encode(7))
    user = User.find(7)
    user.password_digest = "changed-synthetic-digest"
    refute_equal payload[:session_version], JwtService.session_version(user)
  end

  def test_rejects_legacy_expired_and_forged_tokens
    legacy = JWT.encode({ user_id: 7, exp: 1.hour.from_now.to_i }, JwtService::SECRET, "HS256")
    expired = JWT.encode({ user_id: 7, exp: 1.hour.ago.to_i, session_version: "x" }, JwtService::SECRET, "HS256")
    forged = JWT.encode({ user_id: 7, exp: 1.hour.from_now.to_i, session_version: "x" }, "wrong-key", "HS256")
    [ legacy, expired, forged ].each { |token| assert_nil JwtService.decode(token) }
  end
end
