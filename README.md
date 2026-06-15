# Forecast Management

Wewnętrzna aplikacja webowa do zarządzania prognozami sprzedażowymi (pipeline management) dla zespołów IT.

---

## Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Backend | Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL 16 |
| Frontend | React 18 + Tailwind CSS + Vite |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Wykresy | Recharts |
| Deployment | Docker Compose + Nginx |

---

## Wymagania

- Docker 24+
- Docker Compose v2+

---

## Uruchomienie lokalne

### 1. Sklonuj projekt

```bash
git clone https://github.com/pkgotnext/Forecast.git
cd Forecast
```

### 2. Utwórz plik `.env`

```env
SECRET_KEY=<wygeneruj: python3 -c "import secrets; print(secrets.token_hex(32))">
POSTGRES_USER=forecast_user
POSTGRES_PASSWORD=<silne_haslo>
POSTGRES_DB=forecast_db
TAILSCALE_IP=
```

### 3. Uruchom stack

```bash
docker compose up --build -d
```

### 4. Uruchom migrację i seed

```bash
docker compose exec backend python migrate.py
docker compose exec backend python seed.py
docker compose exec backend python seed_history.py
```

### 5. Otwórz aplikację

```
http://localhost
```

---

## Konta użytkowników (domyślne)

| Email | Hasło | Rola |
|---|---|---|
| admin@firma.pl | Admin1234! | MANAGEMENT |
| handlowiec1@firma.pl | Sales1234! | SALES |
| handlowiec2@firma.pl | Sales1234! | SALES |
| handlowiec3@firma.pl | Sales1234! | SALES |
| handlowiec4@firma.pl | Sales1234! | SALES |

**Zmień hasła po pierwszym uruchomieniu** — Navbar → Zmień hasło.

---

## Funkcjonalności

### Dla handlowców (SALES)
- Widzi i edytuje tylko swoje forecasty
- Dodawanie dealów z kalkulatorem marży (przyciski 10–30%)
- **Forecasty rekurencyjne** — projekt wieloletni automatycznie podzielony na kwartały, zgrupowany w tabeli z możliwością rozwijania
- **Edycja pojedynczego kwartału** lub **całej grupy rekurencyjnej** jednocześnie
- Historia zmian każdego dealu (audit trail)
- Toggle kolumn — dostosowanie widoku tabeli
- Filtrowanie po etapie i typie forecasta (zwykłe/rekurencyjne)
- Sortowanie po dacie, wartości, prawdopodobieństwie, kliencie
- Dark mode — przycisk w prawym dolnym rogu

### Dla zarządu (MANAGEMENT)
- Widok wszystkich handlowców w jednej tabeli
- Dashboard z wykresami (Recharts):
  - Marża i marża ważona per kwartał z nawigacją roku
  - Prognoza przychodu per kwartał z możliwością powiększenia
  - Rozkład dealów według etapu
- Filtrowanie po handlowcu, etapie, **wielu kwartałach jednocześnie**, typie forecasta
- Eksport XML ze wszystkimi polami
- Statystyki pipeline (wartość, wartość ważona, średnie prawdopodobieństwo)

### Pola forecasta

| Pole | Opis |
|---|---|
| Klient | Nazwa klienta |
| Projekt | Nazwa projektu |
| Wartość | Wartość dealu w PLN |
| Marża | Marża w PLN |
| Prawdopodobieństwo | 0–100% |
| Kwartał | Kwartał zamknięcia |
| Etap | Prospecting / Proposal / Negocjacje / Wygrany / Przegrany |
| Wdrożenie | Tak/Nie |
| Producent | Nazwa producenta (np. Cisco, Fortinet) |
| Data faktury | Miesiąc wystawienia faktury |
| Data płatności | Miesiąc płatności |
| Architektura | Opis architektury rozwiązania |
| Notatki | Dowolne notatki |

---

## Model danych

```
users
└── id, email, full_name, hashed_password, role, is_active, created_at

forecasts
└── id, user_id (FK), client_name, deal_value, probability
    expected_close_date, stage, notes, project_name, margin
    wdrozenie, producent, data_faktury, data_platnosci, architektura
    recurring_group_id (UUID), created_at, updated_at

forecast_history
└── id, forecast_id (FK), changed_by_id (FK)
    change_type (created/updated/deleted)
    changed_fields (JSON), snapshot wszystkich pól, recorded_at
```

---

## API — endpointy

| Metoda | Endpoint | Opis | Rola |
|---|---|---|---|
| POST | `/api/forecasts` | Utwórz forecast | SALES |
| POST | `/api/forecasts/recurring` | Utwórz grupę rekurencyjną | SALES |
| GET | `/api/forecasts/my` | Forecasty handlowca | SALES |
| GET | `/api/forecasts/my/stats` | Statystyki handlowca | SALES |
| PUT | `/api/forecasts/{id}` | Edytuj forecast | AUTH |
| DELETE | `/api/forecasts/{id}` | Usuń forecast | AUTH |
| GET | `/api/forecasts/{id}/history` | Historia forecasta | AUTH |
| DELETE | `/api/forecasts/recurring/group` | Usuń grupę | AUTH |
| PUT | `/api/forecasts/recurring/group/{id}` | Edytuj całą grupę | AUTH |
| GET | `/api/forecasts` | Wszystkie forecasty | MANAGEMENT |
| GET | `/api/forecasts/management/stats` | Statystyki zarządu | MANAGEMENT |
| GET | `/api/forecasts/management/export/xml` | Eksport XML | MANAGEMENT |

---

## Bezpieczeństwo

- Hasła hashowane bcrypt
- JWT Bearer token (ważność 8h)
- SALES nie może przez API odczytać danych innego handlowca
- Swagger wyłączony (`docs_url=None`)
- CORS skonfigurowany dla znanych origins

---

## Struktura projektu

```
Forecast/
├── .env
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── api/          # auth.py, forecasts.py, users.py
│   │   ├── core/         # config.py, database.py, security.py
│   │   ├── models/       # user.py, forecast.py, forecast_history.py
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # history.py (audit trail)
│   │   └── main.py
│   ├── migrate.py        # Migracja kolumn + backfill recurring_group_id
│   ├── seed.py           # Inicjalizacja użytkowników
│   └── seed_history.py   # Dane testowe
└── frontend/
    └── src/
        ├── components/   # ForecastTable, ForecastModal, GroupEditModal,
        │                 # RecurringForecastModal, HistoryModal, ConfirmModal,
        │                 # StatsCards, Navbar, OfflineBanner
        ├── pages/        # SalesDashboard, ManagementDashboard, LoginPage
        ├── store/        # AuthContext.jsx
        └── utils/        # api.js, format.jsx
```

---

## Zmienne środowiskowe

| Zmienna | Opis |
|---|---|
| `SECRET_KEY` | Klucz JWT (min. 32 znaki hex) |
| `POSTGRES_USER` | Użytkownik PostgreSQL |
| `POSTGRES_PASSWORD` | Hasło PostgreSQL |
| `POSTGRES_DB` | Nazwa bazy danych |
| `TAILSCALE_IP` | Adres IP w sieci Tailscale (opcjonalne) |