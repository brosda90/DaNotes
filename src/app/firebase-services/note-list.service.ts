import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Note } from '../interfaces/note.interface';

@Injectable({
  providedIn: 'root',
})
export class NoteListService {
  trashNotes: Note[] = [];
  normalNotes: Note[] = [];
  normalMarkedNotes: Note[] = [];

  unsubNotes;
  unsubMarkedNotes;
  unsubTrash;

  firestore: Firestore = inject(Firestore);

  constructor() {
    this.unsubTrash = this.subTrashList();
    this.unsubMarkedNotes = this.subNotesMarkedList();
    this.unsubNotes = this.subNotesList();
  }

  async updateNote(note: Note) {
    if (note.id) {
      let docRef = this.getSingleDocRef(this.getColIdFromNote(note), note.id);
      await updateDoc(docRef, this.getCleanJson(note)).catch((err) => {
        console.log(err);
      });
    }
  }

  getCleanJson(note: Note): {} {
    return {
      type: note.type,
      title: note.title,
      content: note.content,
      marked: note.marked,
    };
  }

  getColIdFromNote(note: Note) {
    if (note.type == 'note') {
      return 'notes';
    } else {
      return 'trash';
    }
  }

  async deleteNote(colId: 'notes' | 'trash', docId: string) {
    await deleteDoc(this.getSingleDocRef(colId, docId)).catch((err) => {
      console.log(err);
    });
  }

  async addNote(item: Note, colId: 'notes' | 'trash') {
    let collectionRef;

    if (colId === 'notes') {
      collectionRef = this.getNotesRef();
    } else {
      collectionRef = this.getTrashRef();
    }

    try {
      const docRef = await addDoc(collectionRef, item);
      console.log('Document written with ID:', docRef.id);
    } catch (err) {
      console.error('Error adding document: ', err);
    }
  }

  ngOnDestroy() {
    this.unsubNotes();
    this.unsubMarkedNotes();
    this.unsubTrash();
  }

  subTrashList() {
    const q = query(this.getTrashRef(), limit(50));
    return onSnapshot(q, (list) => {
      this.trashNotes = [];
      list.forEach((element) => {
        this.trashNotes.push(this.setNoteObject(element.data(), element.id));
      });
    });
  }

  subNotesList() {
    const q = query(this.getNotesRef(), orderBy('title'), limit(50));
    return onSnapshot(q, (list) => {
      this.normalNotes = [];
      list.forEach((element) => {
        this.normalNotes.push(this.setNoteObject(element.data(), element.id));
        console.log(element.data());
      });
      list.docChanges().forEach((change) => {
        if (change.type === 'added') {
          console.log('New note: ', change.doc.data());
        }
        if (change.type === 'modified') {
          console.log('Modified note: ', change.doc.data());
        }
        if (change.type === 'removed') {
          console.log('Removed note: ', change.doc.data());
        }
      });
    });
  }

  subNotesMarkedList() {
    const q = query(this.getNotesRef(), where('marked', '==', true), limit(50));
    return onSnapshot(q, (list) => {
      this.normalNotes = [];
      list.forEach((element) => {
        this.normalMarkedNotes.push(
          this.setNoteObject(element.data(), element.id),
        );
        console.log(element.data());
      });
    });
  }

  setNoteObject(obj: any, id: string): Note {
    return {
      id: id,
      type: obj.type || 'note',
      title: obj.title || '',
      content: obj.content || '',
      marked: obj.marked || false,
    };
  }

  //const itemCollection = collection(this.firestore, 'items');

  getNotesRef() {
    return collection(this.firestore, 'notes');
  }

  getTrashRef() {
    return collection(this.firestore, 'trash');
  }

  getSingleDocRef(colId: string, docId: string) {
    return doc(collection(this.firestore, colId), docId);
  }
}
