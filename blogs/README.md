# Create Dynamic Ambient Music Using AI and IoT Data

![blog cover](images/cover.png)

This tutorial shows how to generate evolving ambient music driven by IoT sensor data. We’ll ingest sensor readings into **GridDB** database, map those readings to musical parameters using OpenAI, and call **ElevenLabs Music** to render an audio track. The UI is built with **React + Vite**, and the backend is **Node.js**.

## Introduction

Ambient music thrives on context. Here, the environment literally composes the score. Heat can slow the tempo, humidity can soften the timbre, and human presence can thicken the arrangement. We’ll stitch together a small system: devices post telemetry (we will use the data directly), GridDB keeps the data, the AI model create music parameters, and ElevenLabs will renders audio that you can play instantly in the browser.

## System Architecture

![sys arch](images/griddb-elevenlabs-ambient-music.png)


The system has several core components working together to turn IoT data into ambient sound:

**IoT Data Source**

Environmental sensors capture values such as temperature, humidity, sound levels, and occupancy. These readings are the raw input for the music generation process.

**Node.js Backend**

Node.js acts as the central orchestrator. It receives IoT sensor readings and coordinates interactions between the AI models, the music generator, and the database.

**OpenAI Model**

The IoT data is processed by an OpenAI model. The model transforms the data into a musical prompt. For example, “calm ambient soundscape with airy textures and slow tempo.” This ensures the music reflects the current environment in a more human-like, descriptive way.

**ElevenLabs Music API**

The generated music prompt is sent to the ElevenLabs Music API. ElevenLabs then produces an audio track that matches the description. The result is ambient audio that adapts to real-world conditions.

**GridDB Database**

Both the music prompt and the audio metadata (such as file path or data URL) are stored in GridDB. GridDB also keeps the original IoT readings.

**React + Vite Frontend**

The frontend provides a web-based interface where users can trigger new music generation, view sensor snapshots, and play the most recent ambient tracks.


## Prerequisites

### Node.js

This project is built using Next.js, which requires Node.js version 16 or higher. You can download and install Node.js from [https://nodejs.org/en](https://nodejs.org/en).



### OpenAI

Create the OpenAI API key [here](https://platform.openai.com/). You may need to create a project and enable few models.

![openai models](images/enabled-openai-models.png)

In this project, we will use an AI model from OpenAI:

- `gpt-5-mini` to create audio prompt.

### GridDB

#### Sign Up for GridDB Cloud Free Plan

If you would like to sign up for a GridDB Cloud Free instance, you can do so at the following link: [https://form.ict-toshiba.jp/download_form_griddb_cloud_freeplan_e](https://form.ict-toshiba.jp/download_form_griddb_cloud_freeplan_e).

After successfully signing up, you will receive a free instance along with the necessary details to access the GridDB Cloud Management GUI, including the **GridDB Cloud Portal URL**, **Contract ID**, **Login**, and **Password**.

#### GridDB WebAPI URL

Go to the GridDB Cloud Portal and copy the WebAPI URL from the **Clusters** section. It should look like this:

![GridDB Portal](images/griddb-cloud-portal.png)

#### GridDB Username and Password

Go to the **GridDB Users** section of the GridDB Cloud portal and create or copy the username for `GRIDDB_USERNAME`. The password is set when the user is created for the first time, use this as the `GRIDDB_PASSWORD`.

![GridDB Users](images/griddb-cloud-users.png)

For more details, to get started with GridDB Cloud, please follow this [quick start guide](https://griddb.net/en/blog/griddb-cloud-quick-start-guide/).

#### IP Whitelist

When running this project, please ensure that the IP address where the project is running is whitelisted. Failure to do so will result in a 403 status code or forbidden access.

You can use a website like [What Is My IP Address](https://whatismyipaddress.com/) to find your public IP address.

To whitelist the IP, go to the GridDB Cloud Admin and navigate to the **Network Access** menu.

![ip whitelist](images/ip-whitelist.png)

### ElevenLabs

You need an ElevenLabs account and API key to use this project. You can sign up for an account at [https://elevenlabs.io/signup](https://elevenlabs.io/signup).

After signing up, go to the [**Developer**](https://elevenlabs.io/app/developers/api-keys) section, and create and copy your API key.

![ElevenLabs API Key](images/elevenlabs-api-key.png)

And make sure to enable the **Music Generation** access permission.


## How to Run

### 1. Clone the repository

Clone the repository from [https://github.com/junwatu/grid-sound-ambient](https://github.com/junwatu/grid-sound-ambient) to your local machine.

```sh
git clone https://github.com/junwatu/grid-sound-ambient.git
cd grid-sound-ambient
cd apps
```

### 2. Install dependencies

Install all project dependencies using npm.

```sh
npm install
```

### 3. Set up environment variables

Copy file `.env.example` to `.env` and fill in the values:

```ini
# Copy this file to .env.local and add your actual API keys
# Never commit .env.local to version control

# ElevenLabs API Key for ElevenLabs Music
ELEVENLABS_API_KEY=

OPENAI_API_KEY=

GRIDDB_WEBAPI_URL=
GRIDDB_PASSWORD=
GRIDDB_USERNAME=

WEB_URL=http://localhost:3000
```

Please look the section on [Prerequisites](#prerequisites) before running the project.

### 4. Run the project

Run the project using the following command:

```sh
npm run start
```

### 5. Open the application

Open the application in your browser at [http://localhost:3000](http://localhost:3000) or any address that `WEB_URL` set to. You also need to allow the browser to access your microphone.


![app screenshot](images/app-sc-1.png)

## Building The Ambient Music Generator


### IoT Data

In this project we will use pre-made IoT data. The data is an array of sensor snapshots. Each object is a single time-stamped reading for a building zone. This data mimic real data condition from the IoT sensor.

```json
[
  {
    "timestamp": "2025-08-20T09:15:00",
    "zone": "Meeting Room A",
    "temperature_c": 22.8,
    "humidity_pct": 47,
    "co2_ppm": 1020,
    "voc_index": 185,
    "occupancy": 7,
    "noise_dba": 49,
    "productivity_score": 65,
    "trend_10min.co2_ppm_delta": 120,
    "trend_10min.noise_dba_delta": 1,
    "trend_10min.productivity_delta": -5
  },
  ...
]
```

You can look the data sample in the `apps/data/iot_music_samples.json`.

## User Interface

The UI is a small React app (Vite + Tailwind) that drives the end‑to‑end flow and plays generated audio.

The workflow for the user is:

1. Click the **Load example** button to load sensor data into the text input or you can paste a single sensor snapshot JSON into the textarea from `apps/data/iot_music_samples.json` file.
2. Click “Generate Music” to call.
3. The app displays the generated prompt, a brief (expandable), and an HTML5 audio player.
4. Optionally, You can open “View History” to fetch recent records and replay saved tracks.

![app flow UI](images/app-flow.png)

These are the server routes use by the client side UI:

| Method & Route              | Trigger in UI                          | Purpose                                      Consumes                                                   |
|----------------------------|----------------------------------------|----------------------------------------------
| `POST` `/api/iot/generate-music` | **Generate Music** button                 | Full pipeline: brief → prompt → music → save 
| `POST` `/api/music/compose`      | **Create Music** (after prompt exists)    | Generate music from existing prompt          
| `GET`  `/api/music/history`      | **View History** modal                    | Load saved generations                       
| `GET`  `/audio/<filename>`       | Audio players in results/history        | Stream ambient music from server                 

The client data returned from the server is JSON. It contains all the data needed for the UI, from music prompt, music brief to audio metadata such as audio path and filename.

![json data](images/client-data.png)

One thing to note here is that OpenAI model is being used to generate music brief which is in JSON AND the music prompt. The reason here is flexibility, the same music brief can be used with other or better non-OpenAI models and also as separation of concerns to handle noisy IoT data in a real situation.

## Generate Music Prompt


### Music Brief


