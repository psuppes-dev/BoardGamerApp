# BoardGamerApp

Mobile Anwendung zur Organisation von Brettspieler-Gruppen

## Projektübersicht

Die BoardGamerApp unterstützt Brettspieler-Gruppen bei der strukturierten Organisation ihrer regelmäßigen Spielabende. Nutzer können Gruppen erstellen oder per Einladungscode beitreten, Spieltermine anlegen und verwalten sowie Spielvorschläge einreichen und darüber abstimmen. Nach einem Abend können Gastgeber, Essen und der Abend allgemein bewertet werden. Zusätzlich ermöglicht die App Gruppennachrichten sowie die Koordination der Essensbestellung für den Abend – inklusive Push-Benachrichtigungen für alle Mitglieder.

## Zentrale Funktionen

- Gruppen erstellen und per Einladungscode beitreten
- Automatische Gastgeber-Rotation nach festgelegter Reihenfolge
- Spieltermine anlegen mit Datum, Uhrzeit und Ort
- Spielvorschläge einreichen und per Abstimmung das Spiel des Abends bestimmen
- Bewertungen für Gastgeber, Essen und Abend nach dem Event abgeben
- Gruppen-Chat mit Verspätungs-Template
- Essensrichtung wählen, Mock-Menü ansehen und Bestellung koordinieren
- Push-Benachrichtigungen bei neuen Terminen und bei ermittelter Mehrheitsrichtung

## Zugriff auf die App

Die BoardGamerApp ist als mobile Anwendung mit React Native und Expo umgesetzt. Für den Zugriff wird die **Expo Go App** auf einem physischen iOS- oder Android-Gerät benötigt.

Nach dem Klonen des Repositories und der Installation der Dependencies (`npm install`) kann die App mit `npx expo start` gestartet werden. Der angezeigte QR-Code wird mit der Expo Go App gescannt.

Für den vollständigen Betrieb wird ein Supabase-Projekt benötigt. Das Datenbankschema liegt unter `supabase/schema.sql` und die zugehörigen RLS-Patches unter `supabase/fix_*.sql`. Die Zugangsdaten werden als Umgebungsvariablen in einer `.env`-Datei hinterlegt (`EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

## Status

Softwareentwicklung abgeschlossen
Alle Pflicht- und optionalen Anforderungen umgesetzt

## Lizenz

Dieses Projekt dient ausschließlich zu Lern- und Ausbildungszwecken.
