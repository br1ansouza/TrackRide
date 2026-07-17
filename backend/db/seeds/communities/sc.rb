FLORIPA = "POINT(-48.5496 -27.5973)"
GAROPABA = "POINT(-48.6178 -28.0267)"

COMMUNITY_SEEDS << {
  user_name: "TrackRide SC",
  email: ENV.fetch("SEED_COMMUNITY_EMAIL", "comunidade@trackride.com"),
  routes: [
    [ "Floripa → Garopaba (Litoral Sul)", "Florianópolis", "Garopaba", FLORIPA, GAROPABA, 90, 100, 88 ],
    [ "Floripa → Bombinhas (Costa Esmeralda)", "Florianópolis", "Bombinhas", FLORIPA, "POINT(-48.5147 -27.1392)", 75, 80, 90 ],
    [ "Floripa → Serra do Rio do Rastro (SC-390)", "Florianópolis", "Serra do Rio do Rastro", FLORIPA, "POINT(-49.6064 -28.0753)", 280, 300, 95 ],
    [ "Floripa → Urubici (Serra Catarinense)", "Florianópolis", "Urubici", FLORIPA, "POINT(-49.5917 -28.0153)", 170, 180, 91 ],
    [ "Floripa → Rancho Queimado (Vale Europeu)", "Florianópolis", "Rancho Queimado", FLORIPA, "POINT(-49.0183 -27.6714)", 70, 75, 86 ],
    [ "Garopaba → Praia do Rosa (Litoral Sul)", "Garopaba", "Praia do Rosa", GAROPABA, "POINT(-48.6336 -28.1250)", 18, 25, 93 ],
    [ "Floripa → Alfredo Wagner (BR-282, Serra)", "Florianópolis", "Alfredo Wagner", FLORIPA, "POINT(-49.3342 -27.6997)", 110, 130, 89 ]
  ]
}
