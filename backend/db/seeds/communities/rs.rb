POA = "POINT(-51.2300 -30.0331)"
TEUTONIA = "POINT(-51.8061 -29.4481)"
CAXIAS = "POINT(-51.1794 -29.1678)"
GRAMADO = "POINT(-50.8764 -29.3785)"
BENTO = "POINT(-51.5187 -29.1678)"

COMMUNITY_SEEDS << {
  user_name: "TrackRide RS",
  email: "comunidade.rs@trackride.com",
  routes: [
    [ "POA → Gramado (Rota Romântica)", "Porto Alegre", "Gramado", POA, GRAMADO, 115, 150, 92 ],
    [ "POA → Torres (Estrada do Mar)", "Porto Alegre", "Torres", POA, "POINT(-49.7332 -29.3352)", 190, 160, 87 ],
    [ "POA → Picada Café (Rota Romântica)", "Porto Alegre", "Picada Café", POA, "POINT(-51.1394 -29.4453)", 70, 80, 85 ],
    [ "Teutônia → Gramado (Serra)", "Teutônia", "Gramado", TEUTONIA, GRAMADO, 105, 130, 90 ],
    [ "Teutônia → Bento Gonçalves (Vale dos Vinhedos)", "Teutônia", "Bento Gonçalves", TEUTONIA, BENTO, 55, 75, 89 ],
    [ "Teutônia → Salvador do Sul (Rota Germânica)", "Teutônia", "Salvador do Sul", TEUTONIA, "POINT(-51.5089 -29.4386)", 40, 55, 85 ],
    [ "Caxias do Sul → Cambará do Sul (Canyons)", "Caxias do Sul", "Cambará do Sul", CAXIAS, "POINT(-50.1444 -29.0475)", 120, 150, 93 ],
    [ "Caxias do Sul → Bento Gonçalves (Vale dos Vinhedos)", "Caxias do Sul", "Bento Gonçalves", CAXIAS, BENTO, 40, 50, 88 ],
    [ "Caxias do Sul → Gramado (Serra Gaúcha)", "Caxias do Sul", "Gramado", CAXIAS, GRAMADO, 70, 90, 91 ],
    [ "Bento Gonçalves → Gramado (Serra Gaúcha)", "Bento Gonçalves", "Gramado", BENTO, GRAMADO, 85, 110, 90 ],
    [ "Bento Gonçalves → Veranópolis (BR-470)", "Bento Gonçalves", "Veranópolis", BENTO, "POINT(-51.5497 -28.9361)", 35, 45, 87 ],
    [ "Bento Gonçalves → Garibaldi (Vale dos Vinhedos)", "Bento Gonçalves", "Garibaldi", BENTO, "POINT(-51.5333 -29.2597)", 16, 25, 88 ]
  ]
}
