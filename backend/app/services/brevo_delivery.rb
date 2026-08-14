class BrevoDelivery
  ENDPOINT = URI("https://api.brevo.com/v3/smtp/email")

  class DeliveryError < StandardError; end

  attr_reader :settings

  def initialize(settings = {})
    @settings = settings
  end

  def deliver!(mail)
    api_key = settings[:api_key].presence || ENV["BREVO_API_KEY"]
    raise DeliveryError, "BREVO_API_KEY ausente" if api_key.blank?

    response = post(api_key, payload_for(mail))

    unless response.is_a?(Net::HTTPSuccess)
      raise DeliveryError, "Brevo respondeu #{response.code}: #{response.body}"
    end

    response
  end

  private

  def post(api_key, payload)
    http = Net::HTTP.new(ENDPOINT.host, ENDPOINT.port)
    http.use_ssl = true
    http.open_timeout = 10
    http.read_timeout = 15

    request = Net::HTTP::Post.new(ENDPOINT.path)
    request["api-key"] = api_key
    request["content-type"] = "application/json"
    request["accept"] = "application/json"
    request.body = payload.to_json

    http.request(request)
  end

  def payload_for(mail)
    payload = {
      sender: { email: Array(mail.from).first },
      to: Array(mail.to).map { |address| { email: address } },
      subject: mail.subject
    }

    html = part_body(mail, mail.html_part, "text/html")
    text = part_body(mail, mail.text_part, "text/plain")

    payload[:htmlContent] = html if html.present?
    payload[:textContent] = text if text.present?
    payload[:htmlContent] = text if html.blank? && text.present?

    payload
  end

  def part_body(mail, part, mime_type)
    return part.decoded if part
    return mail.body.decoded if mail.mime_type == mime_type

    nil
  end
end
