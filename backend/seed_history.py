from app.models.forecast import Forecast, ForecastStage
from app.models.forecast_history import ForecastHistory
from app.models.user import User
from app.core.database import SessionLocal
from app.services.history import record_history
from datetime import date, datetime

db = SessionLocal()
db.query(ForecastHistory).delete()
db.query(Forecast).delete()
db.commit()

dane = [
    # Anna Nowak (user2) - infrastruktura sieciowa
    Forecast(user_id=2, client_name='PKO Bank Polski', project_name='Modernizacja sieci LAN/WAN', deal_value=380000, margin=114000, probability=75, expected_close_date=date(2026,6,30), stage=ForecastStage.NEGOTIATION, notes='Trzecia runda negocjacji, decyzja w czerwcu', wdrozenie='nie', producent='Cisco', data_faktury='Lipiec 2026', data_platnosci='Sierpień 2026', architektura='SD-WAN'),
    Forecast(user_id=2, client_name='LPP S.A.', project_name='Infrastruktura sieciowa DC', deal_value=520000, margin=156000, probability=85, expected_close_date=date(2026,6,30), stage=ForecastStage.CLOSED_WON, notes='Umowa podpisana, start wdrożenia lipiec', wdrozenie='tak', producent='Juniper', data_faktury='Czerwiec 2026', data_platnosci='Lipiec 2026', architektura='Leaf-Spine DC'),
    Forecast(user_id=2, client_name='Medicover', project_name='Rozbudowa sieci WiFi placówek', deal_value=210000, margin=63000, probability=70, expected_close_date=date(2026,9,30), stage=ForecastStage.NEGOTIATION, notes='Finalizacja zakresu, 45 placówek', wdrozenie='nie', producent='Aruba', data_faktury='Październik 2026', data_platnosci='Listopad 2026', architektura='WiFi 6'),
    Forecast(user_id=2, client_name='Santander Bank', project_name='Firewall NGFW wymiana', deal_value=280000, margin=84000, probability=50, expected_close_date=date(2026,12,31), stage=ForecastStage.PROPOSAL, notes='Demo zaplanowane na lipiec', wdrozenie='nie', producent='Palo Alto', data_faktury='Styczeń 2027', data_platnosci='Luty 2027', architektura='NGFW HA'),
    Forecast(user_id=2, client_name='Rossmann Polska', project_name='SD-WAN rollout sklepy', deal_value=175000, margin=52500, probability=40, expected_close_date=date(2026,9,30), stage=ForecastStage.PROSPECTING, notes='Wstępne rozmowy, 180 sklepów w Polsce', wdrozenie='nie', producent='Fortinet', data_faktury=None, data_platnosci=None, architektura='SD-WAN'),
    Forecast(user_id=2, client_name='Empik', project_name='Wymiana switchy core', deal_value=95000, margin=28500, probability=20, expected_close_date=date(2027,3,31), stage=ForecastStage.CLOSED_LOST, notes='Wybrali tańsze rozwiązanie od konkurencji', wdrozenie='nie', producent='Cisco', data_faktury=None, data_platnosci=None, architektura='Core/Access'),

    # Piotr Wiśniewski (user3)
    Forecast(user_id=3, client_name='PGE Polska Grupa Energetyczna', project_name='OT/IT Network Segmentation', deal_value=650000, margin=195000, probability=70, expected_close_date=date(2026,9,30), stage=ForecastStage.NEGOTIATION, notes='Projekt strategiczny, wymogi NIS2', wdrozenie='nie', producent='Cisco', data_faktury='Październik 2026', data_platnosci='Grudzień 2026', architektura='OT/IT Segmentation'),
    Forecast(user_id=3, client_name='InPost', project_name='Sieć sortowni automatyzacja', deal_value=420000, margin=126000, probability=90, expected_close_date=date(2026,6,30), stage=ForecastStage.CLOSED_WON, notes='Wdrożenie startuje w lipcu, 12 sortowni', wdrozenie='tak', producent='Juniper', data_faktury='Czerwiec 2026', data_platnosci='Sierpień 2026', architektura='Leaf-Spine'),
    Forecast(user_id=3, client_name='Orange Polska', project_name='Migracja MPLS do SD-WAN', deal_value=580000, margin=174000, probability=65, expected_close_date=date(2026,9,30), stage=ForecastStage.NEGOTIATION, notes='Negocjacje z działem zakupów, duży przetarg', wdrozenie='nie', producent='VMware', data_faktury='Listopad 2026', data_platnosci='Styczeń 2027', architektura='SD-WAN'),
    Forecast(user_id=3, client_name='PKN Orlen', project_name='Zero Trust Network Access', deal_value=720000, margin=216000, probability=60, expected_close_date=date(2026,12,31), stage=ForecastStage.PROPOSAL, notes='Duży przetarg, wymogi bezpieczeństwa rafinerie', wdrozenie='nie', producent='Zscaler', data_faktury='Styczeń 2027', data_platnosci='Marzec 2027', architektura='ZTNA'),
    Forecast(user_id=3, client_name='T-Mobile Polska', project_name='Rozbudowa core network B2B', deal_value=340000, margin=102000, probability=80, expected_close_date=date(2026,6,30), stage=ForecastStage.CLOSED_WON, notes='Podpisano w maju, realizacja Q3', wdrozenie='tak', producent='Nokia', data_faktury='Czerwiec 2026', data_platnosci='Lipiec 2026', architektura='Core Network'),
    Forecast(user_id=3, client_name='CD Projekt', project_name='Bezpieczeństwo sieci studio', deal_value=145000, margin=43500, probability=45, expected_close_date=date(2026,9,30), stage=ForecastStage.PROSPECTING, notes='Wstępne rozmowy po incydencie bezpieczeństwa', wdrozenie='nie', producent='Palo Alto', data_faktury=None, data_platnosci=None, architektura='NGFW + SASE'),

    # Piotr Kowalski (user4)
    Forecast(user_id=4, client_name='Mbank', project_name='Network Access Control wdrożenie', deal_value=320000, margin=96000, probability=70, expected_close_date=date(2026,9,30), stage=ForecastStage.NEGOTIATION, notes='Projekt strategiczny, wymogi KNF', wdrozenie='nie', producent='Cisco', data_faktury='Październik 2026', data_platnosci='Grudzień 2026', architektura='NAC 802.1X'),
    Forecast(user_id=4, client_name='CCC S.A.', project_name='Sieć magazynów automatyzacja', deal_value=445000, margin=133500, probability=80, expected_close_date=date(2026,6,30), stage=ForecastStage.CLOSED_WON, notes='Kontrakt podpisany, 8 magazynów', wdrozenie='tak', producent='Aruba', data_faktury='Lipiec 2026', data_platnosci='Sierpień 2026', architektura='WiFi 6 + Wired'),
    Forecast(user_id=4, client_name='Polsat Cyfrowy', project_name='CDN i load balancing', deal_value=285000, margin=85500, probability=65, expected_close_date=date(2026,9,30), stage=ForecastStage.NEGOTIATION, notes='Pilotaż zakończony sukcesem', wdrozenie='nie', producent='F5', data_faktury='Listopad 2026', data_platnosci='Styczeń 2027', architektura='ADC/CDN'),
    Forecast(user_id=4, client_name='Biedronka', project_name='SD-WAN sklepy ogólnopolski rollout', deal_value=890000, margin=267000, probability=50, expected_close_date=date(2026,12,31), stage=ForecastStage.PROPOSAL, notes='Długi proces decyzyjny, 3200 sklepów', wdrozenie='nie', producent='Fortinet', data_faktury='Luty 2027', data_platnosci='Kwiecień 2027', architektura='SD-WAN'),
    Forecast(user_id=4, client_name='Warta S.A.', project_name='SASE implementacja', deal_value=310000, margin=93000, probability=55, expected_close_date=date(2026,12,31), stage=ForecastStage.PROPOSAL, notes='Konkurujemy z dużym integratorem', wdrozenie='nie', producent='Zscaler', data_faktury='Styczeń 2027', data_platnosci='Marzec 2027', architektura='SASE'),
    Forecast(user_id=4, client_name='Cyfrowy Polsat', project_name='Rozbudowa sieci broadcast', deal_value=420000, margin=126000, probability=75, expected_close_date=date(2026,9,30), stage=ForecastStage.NEGOTIATION, notes='Ostatnia runda negocjacji cenowych', wdrozenie='nie', producent='Cisco', data_faktury='Październik 2026', data_platnosci='Grudzień 2026', architektura='Broadcast Network'),

    # Kamil Dąbrowski (user5)
    Forecast(user_id=5, client_name='Nationale-Nederlanden', project_name='Firewall modernizacja oddziały', deal_value=195000, margin=58500, probability=65, expected_close_date=date(2026,9,30), stage=ForecastStage.NEGOTIATION, notes='Drugi kwartał rozmów, 12 oddziałów', wdrozenie='nie', producent='Fortinet', data_faktury='Listopad 2026', data_platnosci='Styczeń 2027', architektura='NGFW'),
    Forecast(user_id=5, client_name='Leroy Merlin Polska', project_name='WiFi sklepy wymiana', deal_value=245000, margin=73500, probability=55, expected_close_date=date(2026,9,30), stage=ForecastStage.PROPOSAL, notes='RFP otrzymane, 48 sklepów', wdrozenie='nie', producent='Aruba', data_faktury='Październik 2026', data_platnosci='Grudzień 2026', architektura='WiFi 6'),
    Forecast(user_id=5, client_name='Citi Handlowy', project_name='Network monitoring SOC', deal_value=380000, margin=114000, probability=70, expected_close_date=date(2026,6,30), stage=ForecastStage.CLOSED_WON, notes='Kontrakt podpisany czerwiec', wdrozenie='tak', producent='Cisco', data_faktury='Lipiec 2026', data_platnosci='Sierpień 2026', architektura='NDR/SOC'),
    Forecast(user_id=5, client_name='Kaufland Polska', project_name='SD-WAN sklepy', deal_value=265000, margin=79500, probability=45, expected_close_date=date(2026,12,31), stage=ForecastStage.PROPOSAL, notes='RFP w trakcie, 245 sklepów', wdrozenie='nie', producent='Cisco', data_faktury='Styczeń 2027', data_platnosci='Marzec 2027', architektura='SD-WAN'),
    Forecast(user_id=5, client_name='Generali Polska', project_name='Zero Trust pilot', deal_value=165000, margin=49500, probability=40, expected_close_date=date(2027,3,31), stage=ForecastStage.PROSPECTING, notes='Wstępne rozmowy po konferencji security', wdrozenie='nie', producent='Zscaler', data_faktury=None, data_platnosci=None, architektura='ZTNA'),
    Forecast(user_id=5, client_name='Groupe SEB Polska', project_name='Ujednolicenie sieci fabryki', deal_value=198000, margin=59400, probability=40, expected_close_date=date(2026,12,31), stage=ForecastStage.PROSPECTING, notes='Kontakt przez targi LogiTrans', wdrozenie='nie', producent='Juniper', data_faktury=None, data_platnosci=None, architektura='OT Network'),
]

db.add_all(dane)
db.flush()

for f in dane:
    record_history(db, f, 'created', f.user_id)

db.commit()

zmiany = [
    (dane[0], {'deal_value': 320000, 'probability': 55, 'stage': ForecastStage.PROPOSAL}, date(2026,3,1)),
    (dane[0], {'deal_value': 360000, 'probability': 65, 'stage': ForecastStage.PROPOSAL}, date(2026,4,15)),
    (dane[0], {'deal_value': 380000, 'probability': 75, 'stage': ForecastStage.NEGOTIATION}, date(2026,5,10)),
    (dane[6], {'deal_value': 520000, 'probability': 55, 'stage': ForecastStage.PROPOSAL}, date(2026,2,1)),
    (dane[6], {'deal_value': 600000, 'probability': 65, 'stage': ForecastStage.NEGOTIATION}, date(2026,4,1)),
    (dane[6], {'deal_value': 650000, 'probability': 70, 'stage': ForecastStage.NEGOTIATION}, date(2026,5,15)),
    (dane[8], {'probability': 40, 'stage': ForecastStage.PROSPECTING}, date(2026,2,1)),
    (dane[8], {'probability': 55, 'stage': ForecastStage.PROPOSAL}, date(2026,3,20)),
    (dane[8], {'probability': 65, 'stage': ForecastStage.NEGOTIATION}, date(2026,5,10)),
    (dane[11], {'probability': 45, 'stage': ForecastStage.PROPOSAL}, date(2026,3,1)),
    (dane[11], {'probability': 70, 'stage': ForecastStage.NEGOTIATION}, date(2026,5,1)),
    (dane[13], {'deal_value': 380000, 'probability': 55, 'stage': ForecastStage.PROPOSAL}, date(2026,3,1)),
    (dane[13], {'deal_value': 420000, 'probability': 70, 'stage': ForecastStage.NEGOTIATION}, date(2026,4,20)),
    (dane[13], {'deal_value': 445000, 'probability': 80, 'stage': ForecastStage.CLOSED_WON}, date(2026,5,15)),
]

for forecast, changes, change_date in zmiany:
    for field, value in changes.items():
        setattr(forecast, field, value)
    entry = ForecastHistory(
        recorded_at=datetime(change_date.year, change_date.month, change_date.day, 10, 0, 0),
        forecast_id=forecast.id,
        user_id=forecast.user_id,
        changed_by_id=forecast.user_id,
        client_name=forecast.client_name,
        deal_value=forecast.deal_value,
        probability=forecast.probability,
        margin=forecast.margin,
        expected_close_date=forecast.expected_close_date,
        stage=forecast.stage,
        notes=forecast.notes,
        change_type='updated',
        changed_fields='["probability", "stage", "deal_value"]',
    )
    db.add(entry)

db.commit()


def add_recurring(db, user_id, client_name, project_name, total_value, total_margin, probability, stage, open_quarter, close_quarter, notes, producent=None, architektura=None):
    def parse_q(q):
        parts = q.split(' ')
        return int(parts[1]) * 4 + int(parts[0].replace('Q', '')) - 1

    def q_to_date(idx):
        year = idx // 4
        qnum = idx % 4 + 1
        last_month = qnum * 3
        last_day = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][last_month - 1]
        return date(year, last_month, last_day)

    open_idx = parse_q(open_quarter)
    close_idx = parse_q(close_quarter)
    n = close_idx - open_idx + 1
    val = round(total_value / n, 2)
    mar = round(total_margin / n, 2)

    forecasts = []
    for i in range(n):
        q_date = q_to_date(open_idx + i)
        f = Forecast(
            user_id=user_id,
            client_name=client_name,
            project_name=project_name,
            deal_value=val,
            margin=mar,
            probability=probability,
            expected_close_date=q_date,
            stage=stage,
            notes='[Rekurencyjny {}/{}] {}'.format(i+1, n, notes).strip(),
            producent=producent,
            architektura=architektura,
            wdrozenie='nie',
        )
        db.add(f)
        forecasts.append(f)
    db.flush()
    for f in forecasts:
        record_history(db, f, 'created', user_id)
    return len(forecasts)


total_recurring = 0
total_recurring += add_recurring(db, 2, 'PKO Bank Polski', 'Managed Network Services 3-letni', 1440000, 432000, 70, ForecastStage.NEGOTIATION, 'Q1 2025', 'Q4 2027', 'Kontrakt ramowy managed services 3 lata', producent='Cisco', architektura='Managed SD-WAN')
total_recurring += add_recurring(db, 3, 'PGE Polska Grupa Energetyczna', 'Utrzymanie infrastruktury OT/IT', 1200000, 360000, 65, ForecastStage.PROPOSAL, 'Q3 2025', 'Q2 2027', 'Umowa serwisowa 2-letnia OT/IT', producent='Cisco', architektura='OT/IT')
total_recurring += add_recurring(db, 4, 'Biedronka', 'Managed SD-WAN sklepy', 2400000, 720000, 55, ForecastStage.PROPOSAL, 'Q1 2026', 'Q4 2027', 'Kontrakt 2-letni managed SD-WAN 3200 sklepów', producent='Fortinet', architektura='SD-WAN')

db.commit()

print('Gotowe!')
print('Klasyczne forecasty:', len(dane))
print('Rekurencyjne forecasty:', total_recurring)
print('Lacznie:', len(dane) + total_recurring)