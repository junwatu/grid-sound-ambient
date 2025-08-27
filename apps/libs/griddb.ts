import { GridDB, type GridDBConfig, type GridDBColumn } from '@junwatu/griddb-client';

// GridDB configuration
const GRIDDB_CONFIG: GridDBConfig = {
    griddbWebApiUrl: process.env.GRIDDB_WEBAPI_URL || '',
    username: process.env.GRIDDB_USERNAME || 'admin',
    password: process.env.GRIDDB_PASSWORD || 'admin',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
};

let griddbClient: GridDB | null = null;

// Get or create GridDB client instance
function getGridDBClient(): GridDB {
    if (!griddbClient) {
        griddbClient = new GridDB(GRIDDB_CONFIG);
    }
    return griddbClient;
}

// Initialize GridDB container (create if not exists)
export async function initGridDB(): Promise<void> {
    try {
        const client = getGridDBClient();
        await createContainerIfNotExists(client);
        console.log('✅ GridDB client connection verified');
    } catch (error) {
        console.error('❌ Failed to initialize GridDB:', error);
        throw error;
    }
}

// Initialize GridDB on server startup with detailed logging
export async function initGridDBOnStartup(): Promise<void> {
    console.log('🔄 Initializing GridDB connection...');

    if (!GRIDDB_CONFIG.griddbWebApiUrl) {
        console.warn('⚠️  GRIDDB_WEBAPI_URL is not configured. Database features will be disabled.');
        return;
    }

    console.log(`📡 Connecting to GridDB at: ${GRIDDB_CONFIG.griddbWebApiUrl}`);
    console.log(`👤 Using username: ${GRIDDB_CONFIG.username}`);

    try {
        await initGridDB();
        console.log('🎉 GridDB initialization completed successfully');
    } catch (error) {
        console.error('💥 GridDB initialization failed:', error);
        console.error('🚨 Database features will not be available');
        // Don't throw error to prevent server startup failure
    }
}

// Create container if it doesn't exist
async function createContainerIfNotExists(client: GridDB) {
    const containerName = 'music_generations';

    try {
        // Check if container exists
        console.log(`🔍 Checking if container '${containerName}' exists...`);
        const exists = await client.containerExists(containerName);

        if (exists) {
            console.log(`✅ Container '${containerName}' already exists`);

            // Check if we need to recreate due to schema changes
            try {
                const schema = await client.getSchema(containerName);
                const idColumn = schema.columns?.find(col => col.name === 'id');

                if (idColumn && idColumn.type === 'INTEGER') {
                    console.log(`🔄 Container schema needs update (ID column is INTEGER, should be LONG)`);
                    console.log(`⚠️  Cannot automatically drop container in GridDB Cloud. Please manually drop the container or use a different container name.`);
                    console.log(`💡 Workaround: Using smaller integer IDs to fit in INTEGER type range`);
                    return; // Continue with existing container, we'll handle the ID size issue differently
                } else {
                    return; // Schema is correct, no need to recreate
                }
            } catch (schemaError) {
                console.warn(`⚠️  Could not check schema, proceeding with existing container`);
                return;
            }
        }

        // Container doesn't exist, create it
        console.log(`📦 Container '${containerName}' not found, creating new container...`);

        const columns: GridDBColumn[] = [
            { name: 'id', type: 'INTEGER' },
            { name: 'timestamp', type: 'TIMESTAMP' },
            { name: 'zone', type: 'STRING' },
            { name: 'temperature_c', type: 'DOUBLE' },
            { name: 'humidity_pct', type: 'INTEGER' },
            { name: 'co2_ppm', type: 'INTEGER' },
            { name: 'voc_index', type: 'INTEGER' },
            { name: 'occupancy', type: 'INTEGER' },
            { name: 'noise_dba', type: 'INTEGER' },
            { name: 'productivity_score', type: 'INTEGER' },
            { name: 'trend_10min_co2_ppm_delta', type: 'INTEGER' },
            { name: 'trend_10min_noise_dba_delta', type: 'INTEGER' },
            { name: 'trend_10min_productivity_delta', type: 'INTEGER' },
            { name: 'music_brief', type: 'STRING' },
            { name: 'music_prompt', type: 'STRING' },
            { name: 'audio_path', type: 'STRING' },
            { name: 'audio_filename', type: 'STRING' },
            { name: 'music_length_ms', type: 'INTEGER' },
            { name: 'model_id', type: 'STRING' },
            { name: 'generation_timestamp', type: 'TIMESTAMP' }
        ];

        const containerOptions = {
            containerName,
            columns,
            containerType: 'COLLECTION' as const,
            rowkey: true
        };

        console.log(`🏗️  Creating COLLECTION container with ${columns.length} columns...`);
        await client.createContainer(containerOptions);
        console.log(`🎉 Container '${containerName}' created successfully`);
    } catch (error) {
        console.error(`❌ Error managing container '${containerName}':`, error);
        throw error;
    }
}

// Interface for music generation record
export interface MusicGenerationRecord {
    timestamp: string;
    zone: string;
    temperature_c: number;
    humidity_pct: number;
    co2_ppm: number;
    voc_index: number;
    occupancy: number;
    noise_dba: number;
    productivity_score: number;
    trend_10min_co2_ppm_delta: number;
    trend_10min_noise_dba_delta: number;
    trend_10min_productivity_delta: number;
    music_brief: string;
    music_prompt: string;
    audio_path: string;
    audio_filename: string;
    music_length_ms: number;
    model_id: string;
    generation_timestamp: string;
}

// Save music generation data to GridDB
export async function saveMusicGeneration(record: MusicGenerationRecord): Promise<void> {
    if (!GRIDDB_CONFIG.griddbWebApiUrl) {
        console.warn('⚠️  GridDB not configured, skipping database save');
        return;
    }

    await initGridDB();

    try {
        const client = getGridDBClient();
        const containerName = 'music_generations';
        console.log(`💾 Saving music generation record for zone: ${record.zone}`);

        // Generate a unique ID that fits in INTEGER range (max 2,147,483,647)
        // Use a combination of current time modulo and random number
        const timeComponent = Date.now() % 1000000; // Last 6 digits of timestamp
        const randomComponent = Math.floor(Math.random() * 1000); // 3 digit random
        const id = timeComponent * 1000 + randomComponent;

        // Prepare the data object for insertion with proper date formatting
        const data = {
            id,
            timestamp: new Date(record.timestamp),
            zone: record.zone,
            temperature_c: record.temperature_c,
            humidity_pct: record.humidity_pct,
            co2_ppm: record.co2_ppm,
            voc_index: record.voc_index,
            occupancy: record.occupancy,
            noise_dba: record.noise_dba,
            productivity_score: record.productivity_score,
            trend_10min_co2_ppm_delta: record.trend_10min_co2_ppm_delta,
            trend_10min_noise_dba_delta: record.trend_10min_noise_dba_delta,
            trend_10min_productivity_delta: record.trend_10min_productivity_delta,
            music_brief: record.music_brief,
            music_prompt: record.music_prompt,
            audio_path: record.audio_path,
            audio_filename: record.audio_filename,
            music_length_ms: record.music_length_ms,
            model_id: record.model_id,
            generation_timestamp: new Date(record.generation_timestamp)
        };

        // GridDB insertion with schema-aware transformation

        // Use the fixed insert method that now handles schema-aware transformation
        await client.insert({
            containerName,
            data: data
        });

        console.log(`✅ Music generation record saved to GridDB (ID: ${id}, Zone: ${record.zone}, File: ${record.audio_filename})`);
    } catch (error) {
        console.error('❌ Failed to save music generation record:', error);
        throw error;
    }
}

// Retrieve music generation records
export async function getMusicGenerations(limit: number = 100): Promise<MusicGenerationRecord[]> {
    if (!GRIDDB_CONFIG.griddbWebApiUrl) {
        console.warn('⚠️  GridDB not configured, returning empty records');
        return [];
    }

    await initGridDB();

    try {
        const client = getGridDBClient();
        const containerName = 'music_generations';
        console.log(`📊 Retrieving ${limit} music generation records from GridDB`);

        const results = await client.select({
            containerName,
            orderBy: 'generation_timestamp',
            order: 'DESC',
            limit
        });

        console.log(`📋 Found ${results.length} records in database`);

        const records: MusicGenerationRecord[] = results.map((row: any) => ({
            timestamp: row.timestamp,
            zone: row.zone,
            temperature_c: row.temperature_c,
            humidity_pct: row.humidity_pct,
            co2_ppm: row.co2_ppm,
            voc_index: row.voc_index,
            occupancy: row.occupancy,
            noise_dba: row.noise_dba,
            productivity_score: row.productivity_score,
            trend_10min_co2_ppm_delta: row.trend_10min_co2_ppm_delta,
            trend_10min_noise_dba_delta: row.trend_10min_noise_dba_delta,
            trend_10min_productivity_delta: row.trend_10min_productivity_delta,
            music_brief: row.music_brief,
            music_prompt: row.music_prompt,
            audio_path: row.audio_path,
            audio_filename: row.audio_filename,
            music_length_ms: row.music_length_ms,
            model_id: row.model_id,
            generation_timestamp: row.generation_timestamp
        }));

        return records;
    } catch (error) {
        console.error('❌ Failed to retrieve music generation records:', error);
        throw error;
    }
}

// Get music generations by zone
export async function getMusicGenerationsByZone(zone: string, limit: number = 50): Promise<MusicGenerationRecord[]> {
    if (!GRIDDB_CONFIG.griddbWebApiUrl) {
        console.warn('⚠️  GridDB not configured, returning empty records');
        return [];
    }

    await initGridDB();

    try {
        const client = getGridDBClient();
        const containerName = 'music_generations';
        console.log(`🔍 Retrieving ${limit} records for zone: ${zone}`);

        const results = await client.select({
            containerName,
            where: 'zone = ?',
            bindings: [zone],
            orderBy: 'generation_timestamp',
            order: 'DESC',
            limit
        });

        console.log(`📋 Found ${results.length} records for zone: ${zone}`);

        const records: MusicGenerationRecord[] = results.map((row: any) => ({
            timestamp: row.timestamp,
            zone: row.zone,
            temperature_c: row.temperature_c,
            humidity_pct: row.humidity_pct,
            co2_ppm: row.co2_ppm,
            voc_index: row.voc_index,
            occupancy: row.occupancy,
            noise_dba: row.noise_dba,
            productivity_score: row.productivity_score,
            trend_10min_co2_ppm_delta: row.trend_10min_co2_ppm_delta,
            trend_10min_noise_dba_delta: row.trend_10min_noise_dba_delta,
            trend_10min_productivity_delta: row.trend_10min_productivity_delta,
            music_brief: row.music_brief,
            music_prompt: row.music_prompt,
            audio_path: row.audio_path,
            audio_filename: row.audio_filename,
            music_length_ms: row.music_length_ms,
            model_id: row.model_id,
            generation_timestamp: row.generation_timestamp
        }));

        return records;
    } catch (error) {
        console.error(`❌ Failed to retrieve records for zone ${zone}:`, error);
        throw error;
    }
}