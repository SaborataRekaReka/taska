import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import clockIcon from '../assests/clock.svg';
import editIcon from '../assests/edit_2.svg';
import { useUiStore } from '../stores/ui';
import styles from './ListTabs.module.css';

const META_TAB_ORDER = ['my-day', 'all'] as const;

const URGENCY_OPTIONS = [
  { id: null, label: 'Любая' },
  { id: 'OVERDUE', label: 'Просрочено' },
  { id: 'TODAY', label: 'Сегодня' },
  { id: 'NEXT_24_HOURS', label: '24 часа' },
] as const;

const PRIORITY_OPTIONS = [
  { id: null, label: 'Любой', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.20)' },
  { id: 'LOW', label: 'Низкий', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
  { id: 'MEDIUM', label: 'Средний', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  { id: 'HIGH', label: 'Высокий', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' },
  { id: 'CRITICAL', label: 'Критичный', color: '#e00000', bg: 'rgba(224, 0, 0, 0.07)' },
] as const;

type OpenMenu = 'urgency' | 'priority' | null;
type ListsPanelMode = 'default' | 'rename';

interface ReorderDragSession {
  listId: string;
  pointerId: number;
  startClientX: number;
  currentClientX: number;
  startScrollLeft: number;
  currentScrollLeft: number;
  pointerOffsetX: number;
  dragTranslateX: number;
  hasMoved: boolean;
}

interface TabDragState {
  active: boolean;
  pointerId: number | null;
  startX: number;
  startScrollLeft: number;
  moved: boolean;
  captured: boolean;
}

export function ListTabs() {
  const demoState = useUiStore((s) => s.demoState);
  const demoLists = useUiStore((s) => s.demoLists);
  const activeListId = useUiStore((s) => s.activeListId);
  const isTempListVisible = useUiStore((s) => s.isTempListVisible);
  const isTempListSaved = useUiStore((s) => s.isTempListSaved);
  const closeMyDayModal = useUiStore((s) => s.closeMyDayModal);
  const setActiveList = useUiStore((s) => s.setActiveList);
  const addDemoList = useUiStore((s) => s.addDemoList);
  const saveTempList = useUiStore((s) => s.saveTempList);
  const renameDemoList = useUiStore((s) => s.renameDemoList);
  const deleteDemoList = useUiStore((s) => s.deleteDemoList);
  const reorderDemoLists = useUiStore((s) => s.reorderDemoLists);
  const filterUrgency = useUiStore((s) => s.filterUrgency);
  const setFilterUrgency = useUiStore((s) => s.setFilterUrgency);
  const filterPriority = useUiStore((s) => s.filterPriority);
  const setFilterPriority = useUiStore((s) => s.setFilterPriority);
  const query = useUiStore((s) => s.searchQuery);
  const setSearch = useUiStore((s) => s.setSearch);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTabsOverflowing, setIsTabsOverflowing] = useState(false);
  const [isTabsDragging, setIsTabsDragging] = useState(false);
  const [listsPanelMode, setListsPanelMode] = useState<ListsPanelMode>('default');
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [focusedEditableId, setFocusedEditableId] = useState<string | null>(null);
  const [reorderPreviewIds, setReorderPreviewIds] = useState<string[] | null>(null);
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<TabDragState>({
    active: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
    captured: false,
  });
  const suppressTabClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number | null>(null);
  const renameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const reorderDragRef = useRef<ReorderDragSession | null>(null);
  const reorderPreviewRef = useRef<string[] | null>(null);

  const isBalance = demoState === 'balanceModalOpen' || demoState === 'dayCreated';
  const tabFromStore = (() => {
    if (activeListId === '__my_day__') {
      return 'my-day';
    }

    if (activeListId === '__no_list__') {
      return 'no-list';
    }

    return activeListId;
  })();

  const currentActiveTab = tabFromStore ?? 'all';

  const noListCount = demoLists.find((l) => l.id === 'no-list')?._count.tasks ?? 0;
  const orderedListTabIds = demoLists
    .map((list) => list.id)
    .filter((id) => (isTempListVisible ? true : id !== 'temp'));
  const tabOrder = [...META_TAB_ORDER, ...orderedListTabIds];

  const visibleTabs = isBalance
    ? tabOrder.filter((id) => id !== 'no-list')
    : tabOrder;
  const renameableTabIds = visibleTabs.filter((id) => id !== 'my-day' && id !== 'all' && id !== 'no-list');
  const reorderableTabIds = renameableTabIds;
  const isRenameMode = listsPanelMode === 'rename';
  const renderedReorderableTabIds = reorderPreviewIds ?? reorderableTabIds;
  const renderedTabs = useMemo(() => {
    if (!isRenameMode || !reorderPreviewIds?.length) {
      return visibleTabs;
    }

    const reorderableSet = new Set(reorderableTabIds);
    const queue = [...reorderPreviewIds];

    return visibleTabs.map((id) => (
      reorderableSet.has(id)
        ? (queue.shift() ?? id)
        : id
    ));
  }, [isRenameMode, reorderPreviewIds, reorderableTabIds, visibleTabs]);
  const updateTabsOverflow = useCallback(() => {
    const tabsNode = tabsRef.current;
    if (!tabsNode) {
      setIsTabsOverflowing(false);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const hasOverflow = tabsNode.scrollWidth > tabsNode.clientWidth + 1;
    setIsTabsOverflowing(hasOverflow);
    setCanScrollLeft(tabsNode.scrollLeft > 1);
    setCanScrollRight(tabsNode.scrollLeft < tabsNode.scrollWidth - tabsNode.clientWidth - 1);
  }, []);

  useLayoutEffect(() => {
    let nestedFrameId = 0;
    const frameId = requestAnimationFrame(() => {
      updateTabsOverflow();
      nestedFrameId = requestAnimationFrame(() => {
        updateTabsOverflow();
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(nestedFrameId);
    };
  }, [updateTabsOverflow, adding, renderedTabs.length]);

  useEffect(() => {
    function onResize() {
      updateTabsOverflow();
    }

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [updateTabsOverflow]);

  useEffect(() => {
    const tabsNode = tabsRef.current;

    if (!tabsNode) {
      return;
    }

    function onScroll() {
      updateTabsOverflow();
    }

    tabsNode.addEventListener('scroll', onScroll);

    return () => tabsNode.removeEventListener('scroll', onScroll);
  }, [updateTabsOverflow]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const tabsNode = tabsRef.current;

    if (!tabsNode) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateTabsOverflow();
    });

    observer.observe(tabsNode);

    return () => observer.disconnect();
  }, [updateTabsOverflow]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openMenu]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpenMenu(null);
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (query) {
          setSearch('');
        } else {
          searchInputRef.current?.blur();
          setIsSearchOpen(false);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, setSearch]);

  useEffect(() => {
    reorderPreviewRef.current = reorderPreviewIds;
  }, [reorderPreviewIds]);

  useEffect(() => {
    if (!isRenameMode) {
      setFocusedEditableId(null);
      setEditingNames({});
      return;
    }

    setEditingNames(
      Object.fromEntries(
        renameableTabIds.map((id) => [id, getLabel(id)]),
      ),
    );
    setFocusedEditableId((current) => (
      current && renameableTabIds.includes(current)
        ? current
        : null
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRenameMode, demoLists]);

  useEffect(() => {
    if (isRenameMode) {
      return;
    }

    setReorderPreviewIds(null);
    setDraggedListId(null);
    reorderDragRef.current = null;
    reorderPreviewRef.current = null;
  }, [isRenameMode]);

  useEffect(() => {
    if (!isRenameMode) {
      return;
    }

    if (reorderDragRef.current) {
      return;
    }

    setReorderPreviewIds(reorderableTabIds);
  }, [isRenameMode, reorderableTabIds]);

  useEffect(() => {
    if (!focusedEditableId || !isRenameMode) {
      return;
    }

    const input = renameInputRefs.current[focusedEditableId];
    if (!input) {
      return;
    }

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }, [focusedEditableId, isRenameMode]);

  useEffect(() => {
    return () => {
      reorderDragRef.current = null;
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
      if (suppressClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }
    };
  }, []);


  useLayoutEffect(() => {
    if (!draggedListId) {
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
      return;
    }

    function handleWindowPointerMove(event: PointerEvent): void {
      if (reorderDragRef.current?.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      moveDraggedList(event.clientX, event.pointerId);
    }

    function handleWindowPointerUp(event: PointerEvent): void {
      if (reorderDragRef.current?.pointerId !== event.pointerId) {
        return;
      }

      finishReorderDrag(true);
    }

    function handleWindowPointerCancel(event: PointerEvent): void {
      if (reorderDragRef.current?.pointerId !== event.pointerId) {
        return;
      }

      finishReorderDrag(false);
    }

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerCancel);

    return () => {
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerCancel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedListId]);

  useLayoutEffect(() => {
    const session = reorderDragRef.current;
    const tabsNode = tabsRef.current;
    if (!session || !draggedListId || !tabsNode) {
      return;
    }

    const draggedNode = tabRefs.current[session.listId];
    if (!draggedNode) {
      return;
    }

    draggedNode.style.transform = '';
    const naturalLeft = draggedNode.getBoundingClientRect().left;
    const desiredLeft = session.currentClientX - session.pointerOffsetX;
    const newTranslateX = desiredLeft - naturalLeft;

    draggedNode.style.transform = `translate3d(${newTranslateX}px, 0, 0)`;
    session.startClientX = session.currentClientX - newTranslateX;
    session.startScrollLeft = tabsNode.scrollLeft;
    session.dragTranslateX = newTranslateX;
  }, [reorderPreviewIds, draggedListId]);

  useEffect(() => {
    function handleWindowPointerEnd(): void {
      if (dragStateRef.current.active) {
        stopTabsDrag();
      }
    }

    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  }, []);

  function stopTabsDrag(): void {
    const tabsNode = tabsRef.current;
    const dragState = dragStateRef.current;

    if (!dragState.active) {
      return;
    }

    if (tabsNode && dragState.pointerId !== null && dragState.captured) {
      try {
        tabsNode.releasePointerCapture(dragState.pointerId);
      } catch {
        // Pointer might already be released by the browser.
      }
    }

    const hasMoved = dragState.moved;
    dragStateRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
      moved: false,
      captured: false,
    };
    setIsTabsDragging(false);
    document.body.style.removeProperty('user-select');

    if (!hasMoved) {
      return;
    }

    suppressTabClickRef.current = true;
    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current);
    }

    suppressClickTimeoutRef.current = window.setTimeout(() => {
      suppressTabClickRef.current = false;
      suppressClickTimeoutRef.current = null;
    }, 0);
  }

  function handleTabsPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!isTabsOverflowing || isRenameMode) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select')) {
      return;
    }

    const tabsNode = tabsRef.current;
    if (!tabsNode) {
      return;
    }

    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: tabsNode.scrollLeft,
      moved: false,
      captured: false,
    };
  }

  function handleTabsPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!isTabsOverflowing || isRenameMode) {
      return;
    }

    const tabsNode = tabsRef.current;
    const dragState = dragStateRef.current;

    if (!tabsNode || !dragState.active || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    if (!dragState.moved && Math.abs(deltaX) > 4) {
      dragState.moved = true;
      document.body.style.userSelect = 'none';
      setIsTabsDragging(true);
    }

    if (dragState.moved && !dragState.captured) {
      tabsNode.setPointerCapture(event.pointerId);
      dragState.captured = true;
    }

    if (!dragState.moved) {
      return;
    }

    event.preventDefault();
    tabsNode.scrollLeft = dragState.startScrollLeft - deltaX;
  }

  function handleTabsPointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!isTabsOverflowing || isRenameMode) {
      return;
    }

    if (dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    stopTabsDrag();
  }

  function handleTabsPointerCancel(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!isTabsOverflowing || isRenameMode) {
      return;
    }

    if (dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    stopTabsDrag();
  }

  function getLabel(id: string): string {
    if (id === 'my-day') return 'Мой день';
    if (id === 'all') return 'Все';
    return demoLists.find((l) => l.id === id)?.name ?? id;
  }

  function closeAddInput(): void {
    setAdding(false);
    setNewName('');
  }

  function setPanelMode(nextMode: ListsPanelMode): void {
    setListsPanelMode((currentMode) => {
      if (currentMode === 'rename' && nextMode !== 'rename') {
        renameableTabIds.forEach((id) => {
          const nextValue = editingNames[id] ?? getLabel(id);
          renameDemoList(id, nextValue);
        });
      }

      return nextMode;
    });
    if (nextMode !== 'rename') {
      setFocusedEditableId(null);
    }
  }

  function finishRenameMode(): void {
    finishReorderDrag(true);
    renameableTabIds.forEach((id) => {
      const nextValue = editingNames[id] ?? getLabel(id);
      renameDemoList(id, nextValue);
    });
    setPanelMode('default');
    setFocusedEditableId(null);
  }

  function handleRenameInputCommit(listId: string): void {
    const nextValue = editingNames[listId] ?? getLabel(listId);
    const renamed = renameDemoList(listId, nextValue);

    if (!renamed) {
      setEditingNames((current) => ({
        ...current,
        [listId]: getLabel(listId),
      }));
    }
  }

  function animateReorderShift(firstLeftById: Map<string, number>, draggedId: string, orderIds: string[]): void {
    requestAnimationFrame(() => {
      orderIds.forEach((id) => {
        if (id === draggedId) {
          return;
        }

        const firstLeft = firstLeftById.get(id);
        const node = tabRefs.current[id];
        if (firstLeft === undefined || !node) {
          return;
        }

        const lastLeft = node.getBoundingClientRect().left;
        const deltaX = firstLeft - lastLeft;
        if (Math.abs(deltaX) < 0.5) {
          return;
        }

        node.animate(
          [
            { transform: `translateX(${deltaX}px)` },
            { transform: 'translateX(0px)' },
          ],
          {
            duration: 220,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        );
      });
    });
  }

  function commitReorder(finalOrder: string[]): void {
    const currentOrder = reorderableTabIds;
    if (!finalOrder.length || finalOrder.length !== currentOrder.length) {
      return;
    }

    if (finalOrder.every((id, index) => id === currentOrder[index])) {
      return;
    }

    const workingOrder = [...currentOrder];

    finalOrder.forEach((desiredId, desiredIndex) => {
      const currentIndex = workingOrder.indexOf(desiredId);

      if (currentIndex === -1 || currentIndex === desiredIndex) {
        return;
      }

      const targetId = workingOrder[desiredIndex];
      if (!targetId) {
        return;
      }

      reorderDemoLists(desiredId, targetId, 'before');

      workingOrder.splice(currentIndex, 1);
      workingOrder.splice(desiredIndex, 0, desiredId);
    });
  }

  function finishReorderDrag(applyResult: boolean): void {
    const session = reorderDragRef.current;
    const preview = reorderPreviewRef.current;

    if (!session) {
      return;
    }

    const draggedNode = tabRefs.current[session.listId];
    if (draggedNode) {
      draggedNode.style.transform = '';
    }

    if (applyResult && session.hasMoved && preview?.length) {
      commitReorder(preview);
    }

    if (session.hasMoved) {
      suppressTabClickRef.current = true;
      if (suppressClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }

      suppressClickTimeoutRef.current = window.setTimeout(() => {
        suppressTabClickRef.current = false;
        suppressClickTimeoutRef.current = null;
      }, 0);
    }

    reorderDragRef.current = null;
    reorderPreviewRef.current = null;
    setDraggedListId(null);
    setReorderPreviewIds(null);
    setFocusedEditableId((current) => (current === session.listId ? null : current));
  }

  function moveDraggedList(clientX: number, pointerId: number): void {
    const session = reorderDragRef.current;
    const tabsNode = tabsRef.current;

    if (!session || session.pointerId !== pointerId || !tabsNode) {
      return;
    }

    const tabsRect = tabsNode.getBoundingClientRect();
    const edgeThreshold = 56;

    if (clientX < tabsRect.left + edgeThreshold) {
      const intensity = (tabsRect.left + edgeThreshold - clientX) / edgeThreshold;
      tabsNode.scrollLeft -= Math.max(4, intensity * 18);
    } else if (clientX > tabsRect.right - edgeThreshold) {
      const intensity = (clientX - (tabsRect.right - edgeThreshold)) / edgeThreshold;
      tabsNode.scrollLeft += Math.max(4, intensity * 18);
    }

    const nextOrder = [...(reorderPreviewRef.current ?? reorderableTabIds)];
    const currentIndex = nextOrder.indexOf(session.listId);
    if (currentIndex === -1) {
      return;
    }

    const firstLeftById = new Map<string, number>();
    nextOrder.forEach((id) => {
      const node = tabRefs.current[id];
      if (node) {
        firstLeftById.set(id, node.getBoundingClientRect().left);
      }
    });

    const targetOrder = [...nextOrder];
    targetOrder.splice(currentIndex, 1);

    let insertIndex = targetOrder.length;
    for (let index = 0; index < targetOrder.length; index += 1) {
      const targetId = targetOrder[index];
      const targetNode = tabRefs.current[targetId];
      if (!targetNode) {
        continue;
      }

      const rect = targetNode.getBoundingClientRect();
      if (clientX < rect.left + rect.width / 2) {
        insertIndex = index;
        break;
      }
    }

    targetOrder.splice(insertIndex, 0, session.listId);

    const hasMoved = Math.abs(clientX - session.startClientX) > 2 || tabsNode.scrollLeft !== session.startScrollLeft;
    const nextTranslateX = (clientX - session.startClientX) + (tabsNode.scrollLeft - session.startScrollLeft);
    const draggedNode = tabRefs.current[session.listId];

    reorderDragRef.current = {
      ...session,
      currentClientX: clientX,
      currentScrollLeft: tabsNode.scrollLeft,
      dragTranslateX: nextTranslateX,
      hasMoved: session.hasMoved || hasMoved,
    };

    if (draggedNode) {
      draggedNode.style.transform = `translate3d(${nextTranslateX}px, 0, 0)`;
    }

    if (!targetOrder.every((id, index) => id === nextOrder[index])) {
      reorderPreviewRef.current = targetOrder;
      setReorderPreviewIds(targetOrder);
      animateReorderShift(firstLeftById, session.listId, targetOrder);
    }
  }

  function startListReorderDrag(event: ReactPointerEvent<HTMLElement>, listId: string): void {
    if (!isRenameMode || !reorderableTabIds.includes(listId) || event.button !== 0) {
      return;
    }

    const tabsNode = tabsRef.current;
    if (!tabsNode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const tabNode = tabRefs.current[listId];
    const pointerOffsetX = tabNode
      ? event.clientX - tabNode.getBoundingClientRect().left
      : 0;

    const nextSession: ReorderDragSession = {
      listId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      currentClientX: event.clientX,
      startScrollLeft: tabsNode.scrollLeft,
      currentScrollLeft: tabsNode.scrollLeft,
      pointerOffsetX,
      dragTranslateX: 0,
      hasMoved: false,
    };

    reorderDragRef.current = nextSession;
    setDraggedListId(listId);
    const nextPreviewIds = reorderPreviewRef.current ?? reorderableTabIds;
    reorderPreviewRef.current = nextPreviewIds;
    setReorderPreviewIds(nextPreviewIds);
    setFocusedEditableId((current) => (current === listId ? null : current));
  }

  function scrollTabs(direction: 'left' | 'right'): void {
    const tabsNode = tabsRef.current;
    if (!tabsNode) {
      return;
    }

    tabsNode.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
  }

  function submitNewList(): void {
    const createdOrExistingListId = addDemoList(newName);

    if (!createdOrExistingListId) {
      return;
    }

    setActiveList(createdOrExistingListId);
    closeMyDayModal();
    closeAddInput();
  }

  function handleTabClick(id: string): void {
    if (isRenameMode) {
      if (renameableTabIds.includes(id)) {
        setEditingNames((current) => ({
          ...current,
          [id]: current[id] ?? getLabel(id),
        }));
        setFocusedEditableId(id);
      }
      return;
    }

    if (id === 'my-day') {
      setActiveList('__my_day__');
      closeMyDayModal();
      return;
    }

    if (id === 'all') {
      setActiveList(null);
      closeMyDayModal();
      return;
    }

    if (id === 'no-list') {
      setActiveList('__no_list__');
    } else {
      setActiveList(id);
    }

    closeMyDayModal();
  }

  const priorityOption = PRIORITY_OPTIONS.find((item) => item.id === filterPriority) ?? PRIORITY_OPTIONS[0];

  return (
    <div className={styles.bar} ref={rootRef}>
      {openMenu && (
        <div
          className={styles.menuBackdrop}
          aria-hidden
          onPointerDown={(event) => {
            event.preventDefault();
            setOpenMenu(null);
          }}
        />
      )}

      <div className={styles.topRow}>
        <div className={styles.tabsViewportWrap}>
        {isRenameMode && isTabsOverflowing && canScrollLeft && (
          <button
            type="button"
            className={`${styles.scrollArrow} ${styles.scrollArrowLeft}`}
            onClick={() => scrollTabs('left')}
            aria-label="Прокрутить влево"
          >
            <svg className={styles.scrollArrowIcon} viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M9 2L4.5 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div className={styles.tabsViewport}>
        <div
          className={`${styles.tabs} ${isTabsOverflowing && !isRenameMode ? styles.tabsDraggable : ''} ${isTabsDragging ? styles.tabsDragging : ''}`}
          ref={tabsRef}
          onPointerDown={handleTabsPointerDown}
          onPointerMove={handleTabsPointerMove}
          onPointerUp={handleTabsPointerUp}
          onPointerCancel={handleTabsPointerCancel}
        >
          {renderedTabs.map((id) => {
            const isActive = currentActiveTab === id;
            const isEditable = renameableTabIds.includes(id);
            const isReorderable = renderedReorderableTabIds.includes(id);
            const showModeActive = isRenameMode && isEditable;
            const isEditingThisTab = showModeActive && focusedEditableId === id;
            const isDragSource = showModeActive && draggedListId === id;

            return (
              <div
                key={id}
                ref={(node) => {
                  tabRefs.current[id] = node;
                }}
                className={`${styles.tab} ${isActive ? styles.active : ''} ${isDragSource ? styles.tabDragSource : ''}`}
              >
                <button
                  type="button"
                  className={`${styles.tabMain} ${showModeActive ? `${styles.tabMainRenameMode} ${styles.tabMainRenameEnter}` : ''} ${showModeActive && isReorderable ? styles.tabMainReorderable : ''} ${isDragSource ? styles.tabMainDragSource : ''}`}
                  onClick={() => {
                    if (suppressTabClickRef.current) {
                      return;
                    }

                    handleTabClick(id);
                  }}
                >
                  {showModeActive && isReorderable && (
                    <span
                      className={styles.dragHandle}
                      aria-hidden
                      title="Перетаскивайте, чтобы изменить порядок"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => {
                        if (!isEditingThisTab) {
                          startListReorderDrag(event, id);
                        }
                      }}
                    >
                      <span className={styles.dragHandleGlyph} aria-hidden>
                        ⋮⋮
                      </span>
                    </span>
                  )}
                  {isEditingThisTab ? (
                    <input
                      ref={(node) => {
                        renameInputRefs.current[id] = node;
                      }}
                      className={styles.renameInput}
                      value={editingNames[id] ?? getLabel(id)}
                      onChange={(event) => {
                        setEditingNames((current) => ({
                          ...current,
                          [id]: event.target.value,
                        }));
                      }}
                      onFocus={() => setFocusedEditableId(id)}
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                      onBlur={() => {
                        handleRenameInputCommit(id);
                        setFocusedEditableId((current) => (current === id ? null : current));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleRenameInputCommit(id);
                          setFocusedEditableId((current) => (current === id ? null : current));
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setEditingNames((current) => ({
                            ...current,
                            [id]: getLabel(id),
                          }));
                          setFocusedEditableId((current) => (current === id ? null : current));
                        }
                      }}
                    />
                  ) : (
                    <span>{getLabel(id)}</span>
                  )}
                  {id === 'no-list' && noListCount > 0 && <span className={styles.badge}>{noListCount}</span>}
                  {id === 'temp' && isTempListVisible && !isTempListSaved && (
                    <span
                      className={styles.chevron}
                      role="button"
                      aria-label="Сохранить временный список"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        saveTempList();
                      }}
                    >
                      &#x2713;
                    </span>
                  )}
                </button>
                {showModeActive && !isDragSource && (
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    aria-label={`Удалить список ${getLabel(id)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteDemoList(id);
                    }}
                  >
                    <svg className={styles.deleteBtnIcon} viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}

          {adding && (
            <span className={styles.addInputWrap}>
              <input
                className={styles.addInput}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    closeAddInput();
                  }

                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitNewList();
                  }
                }}
                onBlur={() => {
                  if (newName.trim()) {
                    submitNewList();
                  } else {
                    closeAddInput();
                  }
                }}
                placeholder="Название..."
                autoFocus
              />
              <button
                type="button"
                className={styles.addConfirmBtn}
                aria-label="Создать список"
                onMouseDown={(event) => event.preventDefault()}
                onClick={submitNewList}
              >
                <svg className={styles.addConfirmBtnIcon} viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </span>
          )}
        </div>
      </div>
        {isRenameMode && isTabsOverflowing && canScrollRight && (
          <button
            type="button"
            className={`${styles.scrollArrow} ${styles.scrollArrowRight}`}
            onClick={() => scrollTabs('right')}
            aria-label="Прокрутить вправо"
          >
            <svg className={styles.scrollArrowIcon} viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M5 2L9.5 7L5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.fixedActions}>
        <button
          type="button"
          className={`${styles.plusBtn} ${isRenameMode ? styles.plusBtnHidden : ''}`}
          aria-label="Добавить список"
          onClick={() => {
            setPanelMode('default');
            setNewName('');
            setAdding(true);
          }}
        >
          +
        </button>

        <button
          type="button"
          className={`${styles.actionBtn} ${isRenameMode ? styles.actionBtnActive : ''}`}
          aria-label={isRenameMode ? 'Завершить редактирование списков' : 'Включить редактирование списков'}
          title={isRenameMode
            ? 'Завершить редактирование списков'
            : 'Режим редактирования: клик по названию — переименовать, перетаскивание за ⋮⋮ — изменить порядок'}
          onClick={() => {
            closeAddInput();
            if (isRenameMode) {
              finishRenameMode();
              return;
            }

            setPanelMode('rename');
          }}
        >
          {isRenameMode ? (
            <svg className={styles.actionBtnCheckIcon} viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <img src={editIcon} className={styles.actionIcon} alt="" aria-hidden />
          )}
        </button>
      </div>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.searchWrap}>
          <div className={`${styles.searchInline} ${isSearchOpen ? styles.searchInlineOpen : ''}`}>
            <button
              type="button"
              className={`${styles.iconBtn} ${isSearchOpen ? styles.iconBtnOpen : ''}`}
              onClick={() => {
                setOpenMenu(null);
                setIsSearchOpen((prev) => {
                  const next = !prev;
                  if (next) {
                    requestAnimationFrame(() => {
                      searchInputRef.current?.focus();
                      searchInputRef.current?.select();
                    });
                  }
                  return next;
                });
              }}
              aria-expanded={isSearchOpen}
              aria-label="Search tasks"
            >
              <svg className={styles.searchTriggerIcon} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <div className={styles.searchRail}>
              <input
                ref={searchInputRef}
                type="search"
                className={styles.searchInput}
                value={query}
                onChange={(event) => setSearch(event.target.value)}
                onBlur={() => {
                  if (!query) {
                    setIsSearchOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') {
                    return;
                  }

                  if (query) {
                    setSearch('');
                  } else {
                    setIsSearchOpen(false);
                    searchInputRef.current?.blur();
                  }
                }}
                placeholder="Поиск"
                aria-label="Поиск задач"
              />
              {query && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  aria-label="Очистить"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSearch('');
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={styles.filterWrap}>
          <div className={`${styles.urgencyInline} ${openMenu === 'urgency' || filterUrgency ? styles.urgencyInlineOpen : ''}`}>
            <button
              type="button"
              className={`${styles.iconBtn} ${openMenu === 'urgency' || filterUrgency ? styles.iconBtnOpen : ''}`}
              onClick={() => {
                setIsSearchOpen(false);
                setOpenMenu((prev) => (prev === 'urgency' ? null : 'urgency'));
              }}
              aria-expanded={openMenu === 'urgency' || !!filterUrgency}
              aria-label="Фильтр по срочности"
            >
              <img src={clockIcon} className={styles.urgencyIcon} alt="" aria-hidden />
            </button>

            <div className={styles.urgencyRail} role="menu" aria-label="Срочность">
              {URGENCY_OPTIONS.filter((o) => o.id !== null).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.urgencyOption} ${filterUrgency === option.id ? styles.urgencyOptionSelected : ''}`}
                  onClick={() => {
                    if (filterUrgency === option.id) {
                      setFilterUrgency(null);
                      setOpenMenu(null);
                    } else {
                      setFilterUrgency(option.id);
                    }
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.filterWrap}>
          <div className={`${styles.priorityInline} ${openMenu === 'priority' ? styles.priorityInlineOpen : ''}`}>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.priorityBtn} ${openMenu === 'priority' ? styles.iconBtnOpen : ''}`}
              onClick={() => {
                setIsSearchOpen(false);
                setOpenMenu((prev) => (prev === 'priority' ? null : 'priority'));
              }}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'priority'}
              aria-label="Priority filter"
            >
              <span
                className={`${styles.priorityDot} ${filterPriority ? '' : styles.priorityDotDefault}`}
                style={filterPriority ? { background: priorityOption.color } : undefined}
              />
            </button>

            <div className={styles.priorityRail} role="menu" aria-label="Priority options">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.id ?? 'all'}
                  type="button"
                  className={`${styles.priorityMenuItem} ${filterPriority === option.id ? styles.priorityMenuItemSelected : ''}`}
                  style={{ background: option.bg }}
                  aria-label={option.label}
                  onClick={() => {
                    setFilterPriority(option.id);
                    setOpenMenu(null);
                  }}
                >
                  <span
                    className={styles.priorityDot}
                    style={{ background: option.color }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

