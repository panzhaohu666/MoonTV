/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SelectorOption {
  label: string;
  value: string;
}

interface DoubanSelectorProps {
  type: 'movie' | 'tv' | 'show';
  primarySelection?: string;
  genreSelection?: string;
  regionSelection?: string;
  eraSelection?: string;
  onPrimaryChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onEraChange: (value: string) => void;
}

const ALL_OPTION: SelectorOption = { label: '全部', value: '全部' };

// 电影一级分类
const moviePrimaryOptions: SelectorOption[] = [
  { label: '热门电影', value: '热门' },
  { label: '最新电影', value: '最新' },
  { label: '豆瓣高分', value: '豆瓣高分' },
  { label: '冷门佳片', value: '冷门佳片' },
];

// 类型
const GENRE_LABELS = [
  '喜剧',
  '动画',
  '动作',
  '爱情',
  '恐怖',
  '战争',
  '科幻',
  '悬疑',
  '犯罪',
  '纪录片',
  '短片',
  '情色',
  '音乐',
  '歌舞',
  '家庭',
  '儿童',
  '传记',
  '历史',
  '奇幻',
  '冒险',
  '灾难',
  '武侠',
  '古装',
  '运动',
  '黑色电影',
  '戏曲',
];

const genreOptions: SelectorOption[] = [
  ALL_OPTION,
  ...GENRE_LABELS.map((genre) => ({ label: genre, value: genre })),
];

// 地区
const REGION_LABELS = [
  '欧美',
  '中国大陆',
  '中国香港',
  '中国台湾',
  '美国',
  '韩国',
  '日本',
  '英国',
  '法国',
  '德国',
  '意大利',
  '西班牙',
  '印度',
  '泰国',
  '俄罗斯',
  '加拿大',
  '澳大利亚',
  '爱尔兰',
  '瑞典',
  '巴西',
  '丹麦',
  '波兰',
  '伊朗',
  '其他',
];

const regionOptions: SelectorOption[] = [
  ALL_OPTION,
  ...REGION_LABELS.map((region) => ({ label: region, value: region })),
];

// 年代
const currentYear = new Date().getFullYear();
const ERA_LABELS = [
  ...Array.from({ length: 6 }, (_, index) => String(currentYear - index)),
  '10年代',
  '00年代',
  '90年代',
  '80年代',
  '更早',
];

const eraOptions: SelectorOption[] = [
  ALL_OPTION,
  ...ERA_LABELS.map((era) => ({ label: era, value: era })),
];

const COLLAPSED_COUNT = 14;

const TagRow: React.FC<{
  label: string;
  options: SelectorOption[];
  value: string;
  onChange: (value: string) => void;
}> = ({ label, options, value, onChange }) => {
  const [expanded, setExpanded] = useState(false);
  const collapsible = options.length > COLLAPSED_COUNT;
  const visibleOptions =
    expanded || !collapsible ? options : options.slice(0, COLLAPSED_COUNT);

  return (
    <div className='flex flex-col sm:flex-row sm:items-start gap-2'>
      <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px] sm:pt-0.5'>
        {label}
      </span>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2 flex-1'>
        {visibleOptions.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`text-xs sm:text-sm whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-green-600 dark:text-green-400 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {option.label}
            </button>
          );
        })}
        {collapsible && (
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className='text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
          >
            {expanded ? '收起 ▲' : '展开 ▼'}
          </button>
        )}
      </div>
    </div>
  );
};

const DoubanSelector: React.FC<DoubanSelectorProps> = ({
  type,
  primarySelection,
  genreSelection,
  regionSelection,
  eraSelection,
  onPrimaryChange,
  onGenreChange,
  onRegionChange,
  onEraChange,
}) => {
  // 电影分类选择器的滑动指示器
  const primaryContainerRef = useRef<HTMLDivElement>(null);
  const primaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [primaryIndicatorStyle, setPrimaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const updateIndicatorPosition = (activeIndex: number) => {
    if (
      activeIndex >= 0 &&
      primaryButtonRefs.current[activeIndex] &&
      primaryContainerRef.current
    ) {
      const timeoutId = setTimeout(() => {
        const button = primaryButtonRefs.current[activeIndex];
        const container = primaryContainerRef.current;
        if (button && container) {
          const buttonRect = button.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (buttonRect.width > 0) {
            setPrimaryIndicatorStyle({
              left: buttonRect.left - containerRect.left,
              width: buttonRect.width,
            });
          }
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    if (type === 'movie') {
      const activeIndex = moviePrimaryOptions.findIndex(
        (opt) =>
          opt.value === (primarySelection || moviePrimaryOptions[0].value)
      );
      updateIndicatorPosition(activeIndex);
    }
  }, [type]);

  useEffect(() => {
    if (type === 'movie') {
      const activeIndex = moviePrimaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
      const cleanup = updateIndicatorPosition(activeIndex);
      return cleanup;
    }
  }, [primarySelection]);

  const renderPrimarySelector = (options: SelectorOption[]) => (
    <div
      ref={primaryContainerRef}
      className='relative inline-flex bg-gray-200/60 rounded-full p-0.5 sm:p-1 dark:bg-gray-700/60 backdrop-blur-sm'
    >
      {/* 滑动的白色背景指示器 */}
      {primaryIndicatorStyle.width > 0 && (
        <div
          className='absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 bg-white dark:bg-gray-500 rounded-full shadow-sm transition-all duration-300 ease-out'
          style={{
            left: `${primaryIndicatorStyle.left}px`,
            width: `${primaryIndicatorStyle.width}px`,
          }}
        />
      )}

      {options.map((option, index) => {
        const isActive =
          (primarySelection || options[0].value) === option.value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              primaryButtonRefs.current[index] = el;
            }}
            onClick={() => onPrimaryChange(option.value)}
            className={`relative z-10 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
              isActive
                ? 'text-gray-900 dark:text-gray-100 cursor-default'
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className='space-y-4 sm:space-y-5'>
      {/* 电影分类 */}
      {type === 'movie' && (
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
            分类
          </span>
          <div className='overflow-x-auto'>
            {renderPrimarySelector(moviePrimaryOptions)}
          </div>
        </div>
      )}

      {/* 类型 */}
      <TagRow
        label='类型'
        options={genreOptions}
        value={genreSelection || '全部'}
        onChange={onGenreChange}
      />

      {/* 地区 */}
      <TagRow
        label='地区'
        options={regionOptions}
        value={regionSelection || '全部'}
        onChange={onRegionChange}
      />

      {/* 年代 */}
      <TagRow
        label='年代'
        options={eraOptions}
        value={eraSelection || '全部'}
        onChange={onEraChange}
      />
    </div>
  );
};

export default DoubanSelector;
