#!/usr/bin/env node

/**
 * Database seeding script for CueMarkers
 * Creates test users, projects, tracks, cues, and settings
 *
 * Usage: npm run seed
 */

const knex = require('../db/knex');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const USERS = [
  { email: 'alice@example.com', password: 'password123', display_name: 'Alice' },
  { email: 'bob@example.com', password: 'password123', display_name: 'Bob' },
  { email: 'charlie@example.com', password: 'password123', display_name: 'Charlie' },
];

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // 1. Clear existing data (in reverse order of FK dependencies)
    console.log('Clearing existing data...');
    await knex('project_settings').del();
    await knex('cues').del();
    await knex('tracks').del();
    await knex('project_members').del();
    await knex('projects').del();
    await knex('users').del();

    // 2. Create users
    console.log('Creating users...');
    const userIds = {};
    for (const user of USERS) {
      const id = uuidv4();
      const password_hash = await bcrypt.hash(user.password, 10);
      await knex('users').insert({
        id,
        email: user.email,
        password_hash,
        display_name: user.display_name,
        created_at: new Date(),
        updated_at: new Date(),
      });
      userIds[user.email] = id;
      console.log(`  ✓ Created user: ${user.email}`);
    }

    // 3. Create projects
    console.log('Creating projects...');
    const projects = [
      {
        name: 'Concert Performance - Main Stage',
        description: 'Timecoded cues for main stage concert performance',
        owner_id: userIds['alice@example.com'],
      },
      {
        name: 'Theater Production - Act 1',
        description: 'Act 1 lighting and sound cues for theater production',
        owner_id: userIds['alice@example.com'],
      },
      {
        name: 'Dance Choreography - Rehearsal',
        description: 'Dance timing and transition cues',
        owner_id: userIds['bob@example.com'],
      },
    ];

    const projectIds = {};
    for (const project of projects) {
      const id = uuidv4();
      await knex('projects').insert({
        id,
        ...project,
        export_id: 101,
        created_at: new Date(),
        updated_at: new Date(),
      });
      projectIds[project.name] = id;
      console.log(`  ✓ Created project: ${project.name}`);

      // Auto-add owner as member
      await knex('project_members').insert({
        id: uuidv4(),
        project_id: id,
        user_id: project.owner_id,
        role: 'owner',
        invited_at: new Date(),
        accepted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // 4. Add project members (invite editors/viewers)
    console.log('Adding project members...');
    const membershipRules = [
      { project: 'Concert Performance - Main Stage', user: 'bob@example.com', role: 'editor' },
      { project: 'Concert Performance - Main Stage', user: 'charlie@example.com', role: 'viewer' },
      { project: 'Theater Production - Act 1', user: 'bob@example.com', role: 'editor' },
      { project: 'Dance Choreography - Rehearsal', user: 'alice@example.com', role: 'editor' },
    ];

    for (const rule of membershipRules) {
      await knex('project_members').insert({
        id: uuidv4(),
        project_id: projectIds[rule.project],
        user_id: userIds[rule.user],
        role: rule.role,
        invited_at: new Date(),
        accepted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`  ✓ Added ${rule.user} as ${rule.role} to ${rule.project}`);
    }

    // 5. Create tracks
    console.log('Creating tracks...');
    const tracks = [
      {
        project_id: projectIds['Concert Performance - Main Stage'],
        name: 'Main Audio Track',
        media_type: 'audio',
        media_filename: null,
        media_s3_key: null,
        media_size: null,
        media_duration: null,
        sort_order: 1,
      },
      {
        project_id: projectIds['Concert Performance - Main Stage'],
        name: 'Backup Track',
        media_type: 'audio',
        media_filename: null,
        media_s3_key: null,
        media_size: null,
        media_duration: null,
        sort_order: 2,
      },
      {
        project_id: projectIds['Theater Production - Act 1'],
        name: 'Background Music',
        media_type: 'audio',
        media_filename: null,
        media_s3_key: null,
        media_size: null,
        media_duration: null,
        sort_order: 1,
      },
      {
        project_id: projectIds['Dance Choreography - Rehearsal'],
        name: 'Dance Track',
        media_type: 'audio',
        media_filename: null,
        media_s3_key: null,
        media_size: null,
        media_duration: null,
        sort_order: 1,
      },
    ];

    const trackIds = {};
    for (let i = 0; i < tracks.length; i++) {
      const id = uuidv4();
      await knex('tracks').insert({
        id,
        ...tracks[i],
        created_at: new Date(),
        updated_at: new Date(),
      });
      trackIds[`track_${i}`] = id;
      console.log(`  ✓ Created track: ${tracks[i].name}`);
    }

    // 6. Create cues for tracks
    console.log('Creating cues...');
    const cuesByTrack = {
      track_0: [
        { name: 'Intro starts', time: 0, fade: 0, marker_color: '#FF0000' },
        { name: 'Verse 1', time: 8.5, fade: 0, marker_color: '#00FF00' },
        { name: 'Chorus', time: 25.2, fade: 0, marker_color: '#0000FF' },
        { name: 'Bridge', time: 45.8, fade: 1, marker_color: '#FFFF00' },
        { name: 'Final chorus', time: 62.3, fade: 0, marker_color: '#0000FF' },
        { name: 'Outro', time: 85.1, fade: 2, marker_color: '#FF00FF' },
      ],
      track_1: [
        { name: 'Safety cue', time: 0, fade: 0, marker_color: '#FFFFFF' },
        { name: 'Main track dropout', time: 45.8, fade: 0, marker_color: '#FF0000' },
        { name: 'Fade in backup', time: 46.2, fade: 3, marker_color: '#00FF00' },
      ],
      track_2: [
        { name: 'Lights on', time: 0, fade: 0, marker_color: '#FFFF00' },
        { name: 'Scene change', time: 120.5, fade: 2, marker_color: '#0000FF' },
        { name: 'Lights fade', time: 240.0, fade: 5, marker_color: '#FF0000' },
      ],
      track_3: [
        { name: 'Dance begins', time: 0, fade: 0, marker_color: '#FF00FF' },
        { name: 'Transition', time: 32.0, fade: 1, marker_color: '#00FFFF' },
        { name: 'Final sequence', time: 64.5, fade: 0, marker_color: '#FF00FF' },
      ],
    };

    let cueCount = 0;
    for (let i = 0; i < 4; i++) {
      const trackId = trackIds[`track_${i}`];
      const cues = cuesByTrack[`track_${i}`] || [];

      for (let j = 0; j < cues.length; j++) {
        const cue = cues[j];
        await knex('cues').insert({
          id: uuidv4(),
          track_id: trackId,
          name: cue.name,
          time: cue.time,
          fade: cue.fade,
          marker_color: cue.marker_color,
          description: `Sample cue: ${cue.name}`,
          created_by: userIds['alice@example.com'],
          sort_order: j + 1,
          created_at: new Date(),
          updated_at: new Date(),
        });
        cueCount++;
      }
    }
    console.log(`  ✓ Created ${cueCount} total cues`);

    // 7. Create project settings
    console.log('Creating project settings...');
    const projectIds_list = Object.values(projectIds);
    for (const projectId of projectIds_list) {
      const defaultSettings = {
        ma3Id: 1,
        triggerType: 'timecode',
        projectTitle: 'CueMarkers Project',
        description: 'Collaborative cue timing project',
      };

      await knex('project_settings').insert({
        id: uuidv4(),
        project_id: projectId,
        settings: defaultSettings,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
    console.log(`  ✓ Created settings for ${projectIds_list.length} projects`);

    console.log('');
    console.log('✅ Database seeding complete!');
    console.log('');
    console.log('Test Credentials:');
    USERS.forEach(user => {
      console.log(`  Email: ${user.email}, Password: ${user.password}`);
    });
    console.log('');
    console.log('Projects created:');
    Object.keys(projectIds).forEach(name => {
      console.log(`  - ${name}`);
    });
    console.log('');
    console.log('Run the server: npm run dev');
    console.log('Visit: http://localhost:3000');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seed();
