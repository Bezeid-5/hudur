import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const projectId = 'hudur-rules-tests';
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const aliceId = 'alice';
const bobId = 'bob';

let testEnv;
let sequence = 0;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  sequence += 1;
});

function id(prefix) {
  return `${prefix}-${sequence}`;
}

function authenticatedDb(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function visitorDb() {
  return testEnv.unauthenticatedContext().firestore();
}

async function seed(callback) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await callback(context.firestore());
  });
}

async function seedAttendance(attendanceId, userId, checkOut = null) {
  await seed(async (db) => {
    await setDoc(doc(db, 'attendances', attendanceId), {
      userId,
      checkIn: Timestamp.fromMillis(Date.now() - 3_600_000),
      checkOut,
    });
  });
}

async function seedActivity(activityId, userId, attendanceId, overrides = {}) {
  await seed(async (db) => {
    await setDoc(doc(db, 'activities', activityId), {
      userId,
      attendanceId,
      title: 'Activité existante',
      durationMinutes: 30,
      createdAt: Timestamp.fromMillis(Date.now() - 1_800_000),
      ...overrides,
    });
  });
}

function validActivity(attendanceId, overrides = {}) {
  return {
    userId: aliceId,
    attendanceId,
    title: 'Réunion équipe',
    durationMinutes: 45,
    description: 'Préparation du sprint',
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

describe('users', () => {
  it('autorise un utilisateur à lire son profil', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', aliceId), {
        displayName: 'Alice', email: 'alice@example.com', role: 'employee',
      });
    });

    await assertSucceeds(getDoc(doc(authenticatedDb(aliceId), 'users', aliceId)));
  });

  it('refuse la lecture du profil d’un autre utilisateur', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', bobId), {
        displayName: 'Bob', email: 'bob@example.com', role: 'employee',
      });
    });

    await assertFails(getDoc(doc(authenticatedDb(aliceId), 'users', bobId)));
  });

  it('autorise la création avec le rôle employee', async () => {
    await assertSucceeds(setDoc(doc(authenticatedDb(aliceId), 'users', aliceId), {
      displayName: 'Alice', email: 'alice@example.com', role: 'employee',
    }));
  });

  it('refuse la création avec le rôle manager', async () => {
    await assertFails(setDoc(doc(authenticatedDb(aliceId), 'users', aliceId), {
      displayName: 'Alice', email: 'alice@example.com', role: 'manager',
    }));
  });

  it('refuse la modification de son propre rôle', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', aliceId), {
        displayName: 'Alice', email: 'alice@example.com', role: 'employee',
      });
    });

    await assertFails(updateDoc(doc(authenticatedDb(aliceId), 'users', aliceId), {
      role: 'manager',
    }));
  });

  it('refuse la suppression d’un profil', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', aliceId), {
        displayName: 'Alice', email: 'alice@example.com', role: 'employee',
      });
    });

    await assertFails(deleteDoc(doc(authenticatedDb(aliceId), 'users', aliceId)));
  });

  it('refuse toute lecture à un visiteur non connecté', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', aliceId), {
        displayName: 'Alice', email: 'alice@example.com', role: 'employee',
      });
    });

    await assertFails(getDoc(doc(visitorDb(), 'users', aliceId)));
  });
});

describe('attendances', () => {
  it('autorise une entrée avec serverTimestamp et sortie nulle', async () => {
    await assertSucceeds(addDoc(collection(authenticatedDb(aliceId), 'attendances'), {
      userId: aliceId, checkIn: serverTimestamp(), checkOut: null,
    }));
  });

  it('refuse une entrée avec une date du client', async () => {
    await assertFails(addDoc(collection(authenticatedDb(aliceId), 'attendances'), {
      userId: aliceId,
      checkIn: Timestamp.fromMillis(Date.now()),
      checkOut: null,
    }));
  });

  it('refuse une entrée au nom d’un autre utilisateur', async () => {
    await assertFails(addDoc(collection(authenticatedDb(aliceId), 'attendances'), {
      userId: bobId, checkIn: serverTimestamp(), checkOut: null,
    }));
  });

  it('autorise la lecture de ses sessions', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId);

    await assertSucceeds(getDoc(doc(authenticatedDb(aliceId), 'attendances', attendanceId)));
  });

  it('refuse la lecture des sessions d’un autre utilisateur', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, bobId);

    await assertFails(getDoc(doc(authenticatedDb(aliceId), 'attendances', attendanceId)));
  });

  it('autorise la fermeture d’une session ouverte', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId);

    await assertSucceeds(updateDoc(doc(authenticatedDb(aliceId), 'attendances', attendanceId), {
      checkOut: serverTimestamp(),
    }));
  });

  it('refuse la modification du checkIn', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId);

    await assertFails(updateDoc(doc(authenticatedDb(aliceId), 'attendances', attendanceId), {
      checkIn: serverTimestamp(), checkOut: serverTimestamp(),
    }));
  });

  it('refuse la deuxième fermeture d’une session déjà fermée', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId, Timestamp.fromMillis(Date.now() - 1_800_000));

    await assertFails(updateDoc(doc(authenticatedDb(aliceId), 'attendances', attendanceId), {
      checkOut: serverTimestamp(),
    }));
  });

  it('refuse la suppression d’une session', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId);

    await assertFails(deleteDoc(doc(authenticatedDb(aliceId), 'attendances', attendanceId)));
  });
});

describe('activities', () => {
  it('autorise la création d’une activité valide', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId);

    await assertSucceeds(addDoc(collection(authenticatedDb(aliceId), 'activities'), validActivity(attendanceId)));
  });

  it('refuse un titre vide', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId);

    await assertFails(addDoc(collection(authenticatedDb(aliceId), 'activities'), validActivity(attendanceId, { title: '' })));
  });

  it('refuse une durée égale à zéro', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId);

    await assertFails(addDoc(collection(authenticatedDb(aliceId), 'activities'), validActivity(attendanceId, { durationMinutes: 0 })));
  });

  it('refuse une durée supérieure à 1440 minutes', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId);

    await assertFails(addDoc(collection(authenticatedDb(aliceId), 'activities'), validActivity(attendanceId, { durationMinutes: 1441 })));
  });

  it('refuse une description de 501 caractères', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId);

    await assertFails(addDoc(collection(authenticatedDb(aliceId), 'activities'), validActivity(attendanceId, {
      description: 'x'.repeat(501),
    })));
  });

  it('refuse un champ inconnu', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, aliceId);

    await assertFails(addDoc(collection(authenticatedDb(aliceId), 'activities'), validActivity(attendanceId, {
      unexpected: true,
    })));
  });

  it('refuse une activité rattachée à la session d’un autre utilisateur', async () => {
    const attendanceId = id('attendance');
    await seedAttendance(attendanceId, bobId);

    await assertFails(addDoc(collection(authenticatedDb(aliceId), 'activities'), validActivity(attendanceId)));
  });

  it('refuse la lecture des activités d’un autre utilisateur', async () => {
    const attendanceId = id('attendance');
    const activityId = id('activity');
    await seedAttendance(attendanceId, bobId);
    await seedActivity(activityId, bobId, attendanceId);

    await assertFails(getDoc(doc(authenticatedDb(aliceId), 'activities', activityId)));
  });

  it('refuse la modification d’une activité', async () => {
    const attendanceId = id('attendance');
    const activityId = id('activity');
    await seedAttendance(attendanceId, aliceId);
    await seedActivity(activityId, aliceId, attendanceId);

    await assertFails(updateDoc(doc(authenticatedDb(aliceId), 'activities', activityId), {
      title: 'Titre modifié',
    }));
  });

  it('refuse la suppression d’une activité', async () => {
    const attendanceId = id('attendance');
    const activityId = id('activity');
    await seedAttendance(attendanceId, aliceId);
    await seedActivity(activityId, aliceId, attendanceId);

    await assertFails(deleteDoc(doc(authenticatedDb(aliceId), 'activities', activityId)));
  });
});