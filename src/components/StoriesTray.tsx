/* eslint-disable react-hooks/rules-of-hooks */
import { useSprings } from '@react-spring/web';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import Story from './Story';
import useWindowSize from '../lib/hooks/useWindowSize';

import { Post } from '@/types';

const calculateCardSizeFromViewPort = (
  viewportWidth: number,
  viewportHeight: number
) => {
  let cardHeight, cardWidth;
  const maxHeight = viewportHeight - 160;

  // Horizontal
  if (viewportWidth > viewportHeight) {
    // 1.25
    cardHeight = viewportHeight / 1.25;
    if (cardHeight > maxHeight) {
      cardHeight = maxHeight;
    }

    cardWidth = cardHeight / 1.8;
  } else {
    cardWidth = viewportWidth / 1.8;
    cardHeight = cardWidth * 1.8;

    if (cardHeight > maxHeight) {
      cardHeight = maxHeight;
      cardWidth = cardHeight / 1.8;
    }
  }

  return {
    cardWidth,
    cardHeight,
  };
};

const getPreviewInfo = (
  viewportWidth: number,
  viewportHeight: number,
  cardWidth: number
) => {
  const ratio = viewportWidth / viewportHeight;
  const spaceLeft = (viewportWidth - cardWidth) / 2;

  let previewCardNum, gapNum, gapWidth, previewCardWidth;

  if (ratio > 1.5) {
    previewCardNum = 2;
    gapNum = 3;
    gapWidth = spaceLeft / 9;
    previewCardWidth = gapWidth * 3;
  } else if (ratio > 0.98) {
    previewCardNum = 1.5;
    gapNum = 2;
    gapWidth = spaceLeft / 5;
    previewCardWidth = gapWidth * 2;
  } else {
    previewCardNum = 0.5;
    gapNum = 1;
    gapWidth = spaceLeft / 2;
    previewCardWidth = gapWidth * 2;
  }

  return {
    previewCardNum,
    gapNum,
    gapWidth,
    previewCardWidth,
    previewCardHeight: previewCardWidth * 1.8,
  };
};

const WINDOW_SIZE = 7;
const MIDDLE_INDEX = Math.floor(WINDOW_SIZE / 2); // 3
const getStoryWindow = (stories: Post[], viewIndex: number) => {
  const offset = Math.ceil((WINDOW_SIZE - 1) / 2);

  return new Array(WINDOW_SIZE).fill(0).map((_, i) => {
    return stories[viewIndex + i - offset];
  });
};

const getTranslateXFromCenter = (
  index: number,
  cardWidth: number,
  gapWidth: number,
  previewCardWidth: number
) => {
  const centerCardX = -cardWidth / 2;
  const offset = index - MIDDLE_INDEX;

  if (offset <= 0) {
    return centerCardX + (offset * previewCardWidth + offset * gapWidth);
  } else {
    return -centerCardX + ((offset - 1) * previewCardWidth + offset * gapWidth);
  }
};

const getTranslateYFromCenter = (
  index: number,
  previewCardHeight: number,
  cardHeight: number
) => {
  if (index === MIDDLE_INDEX) {
    return -cardHeight / 2;
  } else {
    return -previewCardHeight / 2;
  }
};

const DEFAULT_TRANSITION_BUTTON_SIZE = 24;
const getTransitionButtonSizeAndCoord = (
  cardWidth: number,
  gapWidth: number
) => {
  const maxButtonSize = gapWidth * 0.7;
  const buttonSize =
    DEFAULT_TRANSITION_BUTTON_SIZE > maxButtonSize
      ? maxButtonSize
      : DEFAULT_TRANSITION_BUTTON_SIZE;

  const buttonGap = (gapWidth - buttonSize) / 2;
  const buttonXOffset = Math.abs(-cardWidth / 2 - buttonGap - buttonSize);
  const buttonYOffset = buttonSize / 2;

  return {
    size: buttonSize,
    x: buttonXOffset,
    y: buttonYOffset,
    gap: buttonGap,
  };
};

export default function StoriesTray({ stories }: { stories: Post[] }) {
  const isTransition = useRef(false);
  const [viewIndex, setViewIndex] = React.useState(0);
  const visibleStories = getStoryWindow(stories, viewIndex);

  // Do instagram like transition
  const { width: viewportWidth, height: viewportHeight } = useWindowSize();

  if (!viewportHeight || !viewportWidth) {
    return null;
  }

  const { cardWidth, cardHeight } = calculateCardSizeFromViewPort(
    viewportWidth,
    viewportHeight
  );
  const { gapWidth, previewCardWidth, previewCardHeight } = getPreviewInfo(
    viewportWidth,
    viewportHeight,
    cardWidth
  );

  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;

  const buttonCoord = getTransitionButtonSizeAndCoord(cardWidth, gapWidth);

  const hasNext = useMemo(
    () => viewIndex < stories.length - 1,
    [viewIndex, stories]
  );
  const hasPrev = useMemo(() => viewIndex > 0, [viewIndex]);

  const getTransformFromIndex = (i: number) => {
    const translateX = getTranslateXFromCenter(
      i,
      cardWidth,
      gapWidth,
      previewCardWidth
    );

    const translateY = getTranslateYFromCenter(
      i,
      previewCardHeight,
      cardHeight
    );

    const scale = i === MIDDLE_INDEX ? 1 : previewCardWidth / cardWidth;

    return {
      from: {
        x: centerX + translateX,
        y: centerY + translateY,
        scale,
      },
    };
  };

  const [springs, api] = useSprings(
    visibleStories.length,
    getTransformFromIndex,
    [
      viewportWidth,
      viewportHeight,
      previewCardWidth,
      previewCardHeight,
      cardWidth,
      cardHeight,
    ]
  );

  useEffect(() => {
    api.start(getTransformFromIndex);
  });

  const navigateNext = useCallback(() => {
    if (hasNext && !isTransition.current) {
      isTransition.current = true;
      api.start((i: number) => getTransformFromIndex(i - 1).from);

      window.setTimeout(() => {
        api.stop();
        setViewIndex(viewIndex + 1);
        api.start(getTransformFromIndex);

        isTransition.current = false;
      }, 500);
    }
  }, [hasNext, viewIndex]);

  const navigatePrev = useCallback(() => {
    if (hasPrev && !isTransition.current) {
      isTransition.current = true;
      api.start((i: number) => getTransformFromIndex(i + 1).from);

      window.setTimeout(() => {
        api.stop();
        setViewIndex(viewIndex - 1);
        api.start(getTransformFromIndex);

        isTransition.current = false;
      }, 500);
    }
  }, [hasPrev, viewIndex]);

  return (
    <div className='fixed top-0 left-0 flex h-full w-full overflow-hidden bg-slate-900'>
      {visibleStories.map((story, i) => {
        if (!story) {
          return null;
        }

        const style = springs[i];

        return (
          <Story
            key={story.id}
            className='fixed origin-top-left cursor-pointer bg-white bg-cover bg-center px-8 text-4xl text-gray-900'
            width={cardWidth}
            height={cardHeight}
            variant={story.variant}
            style={{
              ...style,
            }}
            onClick={() => {
              if (i > MIDDLE_INDEX) {
                navigateNext();
              } else if (i < MIDDLE_INDEX) {
                navigatePrev();
              }
            }}
          >
            {story.content}
          </Story>
        );
      })}

      {hasPrev && (
        <div
          className='fixed flex cursor-pointer items-center justify-center'
          style={{
            transform: `translate(${centerX - buttonCoord.x}px, ${
              centerY - buttonCoord.y
            }px)`,
            width: buttonCoord.size,
            height: buttonCoord.size,
            fontSize: buttonCoord.size,
          }}
          onClick={navigatePrev}
        >
          <i
            className='fa fa-chevron-circle-left text-white'
            aria-hidden='true'
          />
        </div>
      )}

      {hasNext && (
        <div
          className='fixed flex cursor-pointer items-center justify-center'
          style={{
            transform: `translate(${
              centerX + cardWidth / 2 + buttonCoord.gap
            }px, ${centerY - buttonCoord.y}px)`,
            width: buttonCoord.size,
            height: buttonCoord.size,
            fontSize: buttonCoord.size,
          }}
          onClick={navigateNext}
        >
          <i
            className='fa fa-chevron-circle-right text-white'
            aria-hidden='true'
          />
        </div>
      )}
    </div>
  );
}
